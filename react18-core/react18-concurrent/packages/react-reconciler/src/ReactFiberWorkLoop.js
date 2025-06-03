import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { completeWork } from './ReactFiberCompleteWork'
import { MutationMask, NoFlags, Passive } from './ReactFiberFlags'
import {
  commitMutationEffectsOnFiber,
  commitPassiveUnmountEffects,
  commitPassiveMountEffects,
  commitLayoutEffects
} from './ReactFiberCommitWork'
import { finishQueueingConcurrentUpdates } from './ReactFiberConcurrentUpdates'
import {
  shouldYield,
  scheduleCallback,
  ImmediatePriority as ImmediateSchedulerPriority,
  UserBlockingPriority as UserBlockingSchedulerPriority,
  NormalPriority as NormalSchedulerPriority,
  IdlePriority as IdleSchedulerPriority
} from './Scheduler'
import {
  lanesToEventPriority,
  DiscreteEventPriority,
  ContinuousEventPriority,
  DefaultEventPriority,
  getCurrentUpdatePriority,
  IdleEventPriority
} from './ReactEventPriorities'
import {
  NoLane,
  NoLanes,
  SyncLane,
  markRootUpdated,
  getNextLanes,
  getHighestPriorityLane,
  includesBlockingLane
} from './ReactFiberLane'
import { getCurrentEventPriority } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { scheduleSyncCallback, flushSyncCallbacks } from './ReactFiberSyncTaskQueue'

// 用于记录正在工作的 Fiber 节点
let workInProgress = null


// hook 相关
let rootDoesHavePassiveEffect = false                // 当前渲染的 Fiber 树（Root）​​是否存在需要执行的 Passive Effects​​
let rootWithPendingPassiveEffects = null             // 当前存在待执行 Passive Effects 的 Fiber Root 节点


let workInProgressRoot = null                        // 用来存储 FiberRoot
let workInProgressRootRenderLanes = NoLanes          // 当前的渲染优先级


const RootInProgress = 0                             // 任务在执行中
const RootCompleted = 5                              // 任务已完成
let workInProgressRootExitStatus = RootInProgress    // 标记任务状态：任务在执行中 | 任务已完成


/**
 * 调度更新入口
 * @param {*} root FiberRoot
 * @param {*} fiber RootFiber
 * @param {*} lane 优先级
 */
export const scheduleUpdateOnFiber = (root, fiber, lane) => {
  // 标记根节点更新优先级（初始化阶段是默认优先级）
  markRootUpdated(root, lane)

  ensureRootIsScheduled(root, fiber, lane)
}

/**
 * 调度更新前置区分同步和异步任务
 * @param {*} root FiberRoot
 */
const ensureRootIsScheduled = (root) => {

  // 获取 FiberRoot 的优先级车道（在 scheduleUpdateOnFiber 中调用 markRootUpdated 设置）
  const nextLanes = getNextLanes(root)

  if (nextLanes === NoLanes) return

  // 获取最高优先级车道（这里有点冗余？getNextLanes 中已经回获取最高优先级了）
  const newCallbackPriority = getHighestPriorityLane(nextLanes)

  let newCallbackNode

  if (newCallbackPriority === SyncLane) {
    // 同步任务

    // 先将同步任务存储到同步任务队列
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root))
    // 在微任务中执行同步任务队列中的任务
    queueMicrotask(flushSyncCallbacks)

    newCallbackNode = null
  } else {
    // 异步任务

    let schedulerPriorityLevel

    // lanesToEventPriority：将车道 Lane 转换为事件优先级
    switch (lanesToEventPriority(nextLanes)) {
      case DiscreteEventPriority:
        // 如果是离散事件优先级，则使用立即执行优先级
        // ImmediatePriority 在 Scheduler 中定义，代表立即执行
        schedulerPriorityLevel = ImmediateSchedulerPriority
        break
      case ContinuousEventPriority:
        // 如果是连续事件优先级，则使用用户阻塞优先级
        schedulerPriorityLevel = UserBlockingSchedulerPriority
        break
      case DefaultEventPriority:
        // 其他情况，使用正常优先级
        schedulerPriorityLevel = NormalSchedulerPriority
        break
      case IdleEventPriority:
        // 空闲优先级
        schedulerPriorityLevel = IdleSchedulerPriority
        break
      default:
        // 其他情况，使用正常优先级
        schedulerPriorityLevel = NormalSchedulerPriority
        break
    }

    /**
     * 这里使用 bind，会创建一个闭包，保护 root 参数，null 表示不绑定 this 上下文
     * 确保即使在异步调度执行时，也能访问到正确的 root，防止在并发环境下参数丢失问题
     * 
     * 通过 `scheduleCallback` 调度 `performConcurrentWorkOnRoot`，实现时间切片和中断
     * 
     * 执行 scheduleCallback 会返回当前任务对象 newTask，赋值给 newCallbackNode 
     * 
     * 会先拿到返回的 newTask，再执行 performConcurrentWorkOnRoot
     * 因为 scheduleCallback 中会将 performConcurrentWorkOnRoot 放在 MessageChannel 中执行，这个会在同步任务后面
     */
    newCallbackNode = scheduleCallback(schedulerPriorityLevel, performConcurrentWorkOnRoot.bind(null, root))
  }

  // 将当前执行的任务对象存储到 Fiber 节点上
  root.callbackNode = newCallbackNode
}

/**
 * 同步渲染的核心函数
 * @param {*} root FiberRoot
 * @returns 
 */
const performSyncWorkOnRoot = (root) => {
  // 获取 FiberRoot 上的优先级
  // 经过 scheduleUpdateOnFiber 的 markRootUpdated 设置后，初始化阶段的是默认优先级
  const lanes = getNextLanes(root)

  // 这并不是渲染到页面，而是对 Fiber 树进行一系列的构建和操作
  // 创建 workInProgress，以及 beginWork 和 completeWork 阶段在这里面
  renderRootSync(root, lanes)

  // 渲染后的 workInProgress 树，RootFiber，alternate 是双缓存的新 RootFiber
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork

  // commit 阶段（挂载）
  commitRoot(root)

  return null
}

/**
 * 并发渲染的核心函数，调度执行具体的渲染工作
 * @param {*} root FiberRoot
 * @param {*} didTimeout 是否超时
 */
const performConcurrentWorkOnRoot = (root, didTimeout) => {
  /**
   * 会先拿到返回的 newTask，再执行 performConcurrentWorkOnRoot
   * 因为 scheduleCallback 中会将 performConcurrentWorkOnRoot 放在 MessageChannel 中执行，这个会在同步任务后面
   */
  const originalCallbackNode = root.callbackNode


  // 获取 FiberRoot 上的优先级
  // 经过 scheduleUpdateOnFiber 的 markRootUpdated 设置后，初始化阶段的是默认优先级
  const lanes = getNextLanes(root)
  if (lanes === NoLanes) return null

  // 是否需要进行时间切片
  // 如果 lanes 中不包含阻塞车道，并且没有超时，则需要进行时间切片
  const shouldTimeSlice = !includesBlockingLane(root, lanes) && !didTimeout

  /**
   * 这并不是渲染到页面，而是对 Fiber 树进行一系列的构建和操作
   * 创建 workInProgress，以及 beginWork 和 completeWork 阶段在这里面
   * 
   * exitStatus 表示任务是否在执行中
   */
  const exitStatus = shouldTimeSlice ? renderRootConcurrent(root, lanes) : renderRootSync(root, lanes)


  // 如果任务不是在执行中（异步任务已经执行完）
  if (exitStatus !== RootInProgress) {
    // 渲染后的 workInProgress 树，RootFiber，alternate 是双缓存的新 RootFiber
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork

    // commit 阶段（挂载）
    commitRoot(root)
  }

  /**
   * root.callbackNode 就是 scheduleCallback 返回的 newTask
   * 
   * root.callbackNode 会在 commitRoot 中发生变化
   * 
   * 这是返回给 scheduleCallback 中的 workLoop 函数
   * workLoop 函数中执行回调函数 callback，如果有返回，并且是函数
   * 那么会将这个新的返回函数，放到任务对象中，等待下次执行
   */ 
  if (root.callbackNode === originalCallbackNode) {
    return performConcurrentWorkOnRoot.bind(null, root)
  }

  return null
}

/**
 * 同步对 Fiber 树进行一系列的构建和操作
 * @param {*} root FiberRoot
 * @param {*} lanes 渲染优先级
 */
const renderRootSync = (root, lanes) => {
  // 创建 workInProgress Fiber 树
  if (root !== workInProgressRoot || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }

  // 循环处理 Fiber 树，beginWork 和 completeWork 阶段都在这里
  workLoopSync()

  return workInProgressRootExitStatus
}


const renderRootConcurrent = (root, lanes) => {
  // 创建 workInProgress Fiber 树
  if (root !== workInProgressRoot || workInProgressRootRenderLanes !== lanes) {
    prepareFreshStack(root, lanes);
  }
  // 循环处理 Fiber 树，beginWork 和 completeWork 阶段都在这里
  workLoopConcurrent()

  if (workInProgress !== null) {
    // 如果 workInProgress 不为 null，说明任务还在执行中
    return RootInProgress
  }

  return workInProgressRootExitStatus
}

/**
 * 创建正在工作中的 Fiber 树：workInProgress（双缓存）
 * @param {*} root FiberRoot
 * @param {*} renderLanes 渲染优先级
 */
const prepareFreshStack = (root, renderLanes) => {
  workInProgress = createWorkInProgress(root.current, null)

  // 将当前的渲染优先级赋值给全局变量 workInProgressRootRenderLanes
  workInProgressRootRenderLanes = renderLanes

  // FiberRoot 保存到全局变量 workInProgressRoot
  workInProgressRoot = root

  // 批量处理并发更新队列的，将多个并发的状态更新（如 useReducer）合并到对应 Fiber 节点的更新队列（queue.pending）中
  finishQueueingConcurrentUpdates()
}

/**
 * 同步循环处理 Fiber 树
 * 深度优先遍历，从根节点开始，依次处理每个 Fiber 节点，直到没有未处理的节点（workInProgress === null）
 * workInProgress：表示​当前正在处理的 Fiber 节点的引用​
 */
const workLoopSync = () => {
  while(workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

/**
 * 并发渲染时，循环处理 Fiber 树
 * 会通过 shouldYield 判断浏览器是否空闲，进行时间分片
 */
const workLoopConcurrent = () => {
  while(workInProgress !== null && !shouldYield()) {
    // 如果浏览器还有空闲，并且 workInProgress 不为 null
    performUnitOfWork(workInProgress)
  }
}

/**
 * 处理单个 Fiber 节点的核心函数
 * @param {*} unitOfWork ​当前正在处理的 Fiber 节点的引用​
 */
const performUnitOfWork = (unitOfWork) => {
  // current 是当前屏幕上显示的 Fiber 树（对应真实 DOM），unitOfWork 是新的正在工作的 Fiber 树
  const current = unitOfWork.alternate
  // 返回的 next 是 子 Fiber 节点
  const next = beginWork(current, unitOfWork, workInProgressRootRenderLanes)

  // 经过 beginWork 处理后，可以将 【待生效的 props】 赋值给 【当前生效的 props】
  unitOfWork.memoizedProps = unitOfWork.pendingProps

  // TODO：为了避免死循环，暂时将 workInProgress 先置为 null，后续需要删除
  // workInProgress = null

  if (next === null) {
    // 没有子节点，说明已经处理完成，内部调用 completeWork 将虚拟 DOM 转化为真实 DOM
    // 找兄弟 Fiber，如果没有兄弟 Fiber，向上回溯到父节点（遵循深度优先算法）
    completeUnitOfWork(unitOfWork)
  } else {
    // 有子节点，说明还没有处理完成，向下进入子节点
    workInProgress = next
  }
}

/**
 * 将 Fiber 树转换为真实 DOM
 * @param {*} unitOfWork 当前正在处理的 Fiber 节点的引用​
 */
const completeUnitOfWork = (unitOfWork) => {
  let completedWork = unitOfWork

  // do...while：先执行一次循环体，再判断条件是否成立（至少执行一次）
  // while：先判断条件是否成立，再执行循环体（可能一次也不执行）
  do {
    // 拿到老 Fiber
    const current = completedWork.alternate
    // 拿到新 Fiber 的父节点
    const returnFiber = completedWork.return

    // 将 Fiber 转换为 真实 DOM
    completeWork(current, completedWork)

    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      workInProgress = siblingFiber
      return
    }

    completedWork = returnFiber
    workInProgress = completedWork
  } while(completedWork !== null)

  /**
   * 标记异步并发任务执行完毕
   * 
   * 为什么在这里标记？
   *   因为 beginWork 和 completeWork 阶段，不是一次性完成的
   *   beginWork 阶段中，同层级第一个 Fiber 节点中，如果没有子 Fiber 的节点，那么就开始执行 completeWork 阶段
   *   completeWork 阶段中遇到有子 Fiber 的节点，那么会执行 beginWork 阶段，然后回溯到父节点，继续进行 completeWork 阶段
   * 
   * 所以只有 completeWork 阶段执行完毕，才能标记异步并发任务执行完毕
   */
  if (workInProgressRootExitStatus === RootInProgress) {
    workInProgressRootExitStatus = RootCompleted
  }  
}

/**
 * commit 阶段，执行挂载
 * @param {*} root FiberRoot
 */
const commitRoot = (root) => {
  // finishedWork 在 performConcurrentWorkOnRoot 中赋值
  // 执行完 renderRootSync 后，会将 workInProgress 赋值给 finishedWork
  // renderRootSync 中执行了 beginWork 和 completeWork 阶段
  // 所以 finishedWork 就是 新的 Fiber 树
  const { finishedWork } = root

  // 重置全局变量
  workInProgressRoot = null
  workInProgressRootRenderLanes = NoLanes
  root.callbackNode = null

  // 处理 useEffect | useLayoutEffect 的副作用
  if (
    (finishedWork.subtreeFlags & Passive) !== NoFlags ||
    (finishedWork.flags & Passive) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = true
      // 异步调用，所以 flushPassiveEffect 会延迟执行
      // 会在 commitMutationEffectsOnFiber 之后执行（commitMutationEffectsOnFiber 中做真实 DOM 的挂载）
      // 因为 useEffect 机制：异步，在浏览器绘制后执行
      // 使用 NormalSchedulerPriority 表示当前任务的优先级为正常优先级
      scheduleCallback(NormalSchedulerPriority, flushPassiveEffect)
    }
  }

  // 获取整个子 Fiber 树的所有副作用，在 completeWork 阶段的 bubbleProperties 函数会设置
  const subtreeHasEffects = (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  // 判断根 Fiber 树是否有副作用
  const rootHasEffects = (finishedWork.flags & MutationMask)!== NoFlags

  if (subtreeHasEffects || rootHasEffects) {
    // 执行 DOM 的挂载
    commitMutationEffectsOnFiber(finishedWork, root)

    // 执行 useLayoutEffect 的副作用
    commitLayoutEffects(finishedWork, root)

    // 这里会比 flushPassiveEffect 先执行，所以 flushPassiveEffect 中 rootWithPendingPassiveEffects 是 root
    // 当 DOM 挂载完成后，会执行 flushPassiveEffect
    if (rootDoesHavePassiveEffect) {
      rootDoesHavePassiveEffect = false
      rootWithPendingPassiveEffects = root
    }
  }

  root.current = finishedWork
}

/**
 * 执行 useEffect | useLayoutEffect 的副作用
 */
const flushPassiveEffect = () => {
  if (rootWithPendingPassiveEffects !== null) {
    // 拿到 FiberRoot
    const root = rootWithPendingPassiveEffects

    /**
     * FiberRoot 的 current 是 RootFiber
     * 
     * 这两个函数，就是将 useEffect 中，存储在 Fiber.updateQueue 上的副作用 effect 拿出来使用
     * 
     * commitPassiveUnmountEffects 是执行销毁函数
     * 
     * commitPassiveMountEffects 是执行副作用函数
     * 
     * 清理在前，创建在后，确保在创建新的副作用之前，先清理旧的副作用
     * 需要注意的是，初始化渲染是没有 destroy 函数的，也就是说，这个 destroy 是上一个副作用的
     */
    commitPassiveUnmountEffects(root.current)
    commitPassiveMountEffects(root, root.current)
  }
}

/**
 * 获取 RootFiber 上的优先级 Lane
 * @param {*} fiber 
 * @returns lane
 */
export const requestUpdateLane = (fiber) => {
  // 获取当前的更新优先级
  const updateLane = getCurrentUpdatePriority()

  // 初始化渲染阶段，updateLane 肯定是 NoLane
  if (updateLane !== NoLane) return updateLane

  const eventLane = getCurrentEventPriority()

  return eventLane
}
