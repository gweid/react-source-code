import ReactSharedInternals from 'shared/ReactSharedInternals'
import { enqueueConcurrentHookUpdate } from './ReactFiberConcurrentUpdates'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'

const { ReactCurrentDispatcher } = ReactSharedInternals

/**
 * currentlyRenderingFiber、workInProgressHook、currentHook 三者：
 * ​​初次渲染（mount）​​：
 *  - currentlyRenderingFiber 指向 App 的 Fiber
 *  - workInProgressHook 从 null 开始，逐步构建新 Hook 链表：Hook1 → Hook2 → Hook3 → null
 *  - currentHook 始终为 null（无旧 Fiber）
 * 
 * 更新渲染（update）：
 *  - currentlyRenderingFiber 指向新 Fiber
 *  - currentHook 从旧 Fiber 的链表头开始遍历（Hook1 → Hook2 → Hook3）
 *  - workInProgressHook 按顺序复用旧 Hook 的状态，构建新链表
 */
let currentlyRenderingFiber = null // 正在构建的 Fiber
let workInProgressHook = null // 当前正在处理的 Hook
let currentHook = null // 当前正在复用的旧 Hook 节点​​

// 挂载阶段的 Hook
const HooksDispatcherOnMount = {
  useReducer: mountReducer
}

// 更新阶段的 Hook
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer
}

/**
 * 调度
 * @param {*} fiber // 正在构建的 Fiber
 * @param {*} queue // 更新队列
 * @param {*} action // 更新动作
 */
const dispatchReducerAction = (fiber, queue, action) => {
  const update = {
    action,
    next: null
  }

  // 拿到 FiberRoot
  const root = enqueueConcurrentHookUpdate(fiber, queue, update)

  // 调度更新
  scheduleUpdateOnFiber(root)
}

/**
 * 挂载阶段的 useReducer
 * @param {*} reducer reducer 函数
 * @param {*} initialArg 初始值
 */
function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook()

  // 将初始值赋值给 memoizedState
  hook.memoizedState = initialArg

  const queue = {
    pending: null, // 待处理队列
    dispatch: null // 调度器
  }
  hook.queue = queue

  /**
   * bind 支持参数部分应用（柯里化），比如下面，bind 时先传入一个参数，调用时再传入一个：
   *  function sum(a, b) { return a + b }
   *  const boundSum = sum.bind(null, 2)
   *  boundSum(3) // 5
   */
  const dispatch = queue.dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber, queue)

  return [hook.memoizedState, dispatch]
}

/**
 * 更新阶段的 useReducer
 * @param {*} reducer reducer 函数
 */
function updateReducer(reducer) {
  const hook = updateWorkInProgressHook()

  // queue 和 update 关系，在函数 finishQueueingConcurrentUpdates 中建立
  const queue = hook.queue
  const current = currentHook // 当前正在复用的旧 Hook 节点
  const pendingQueue = queue.pending

  // 获取老的值
  let newState = current.memoizedState

  if (pendingQueue !== null) {
    queue.pending = null

    // pendingQueue.next
    const firstUpdate = pendingQueue.next

    let update = firstUpdate

    do {
      const action = update.action
      newState = reducer(newState, action)
      update = update.next
    } while (update !== null && update !== firstUpdate)
  }

  hook.memoizedState = newState

  // queue.dispatch 在 mountReducer 中赋值
  const dispatch = queue.dispatch

  return [hook.memoizedState, dispatch]
}

/**
 * 初始化一个 hook，并形成链表
 * @returns hook 链表
 */
const mountWorkInProgressHook = () => {
  const hook = {
    memoizedState: null, // 当前状态值（如 useState 的 state）
    queue: null, // 更新队列（存储待处理的状态变更）
    next: null // 下一个 hook（hook 最终会处理成链表）
  }

  // 还没初始化过 hook
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook
  } else {
    // 初始化了一个 hook 之后，workInProgressHook 就不会为 null
    // 依赖 next 形成链表：hook1 -> hook2 -> hook3
    workInProgressHook = workInProgressHook.next = hook
  }

  // 最终会返回一个 Hook 链表
  return workInProgressHook
}

/**
 * 更新阶段的 hook
 * @returns 新的 hook 链表
 */
const updateWorkInProgressHook = () => {
  // currentHook 是 null，就是第一次执行更新 hook，那么拿到第一个 hook 进行更新操作
  if (currentHook === null) {
    // 拿到 CurrentFiber 树，就是老的 Fiber
    const current = currentlyRenderingFiber.alternate
    // 根据 mountWorkInProgressHook 的逻辑，current.memoizedState 就是老的 hook
    currentHook = current.memoizedState
  } else {
    // 如果 currentHook 不是 null，那么就不是第一次执行更新 hook，那么需要拿到下一个 hook
    // hook 链表
    currentHook = currentHook.next
  }

  // 新Hook，实际上就是用的老 hook 的属性值，进行复用
  const newHook = {
    memoizedState: currentHook.memoizedState, // 老 hook 的值
    queue: currentHook.queue, // 老 hook 的更新队列
    next: null // 下一个 hook
  }
  
  if (workInProgressHook === null) {
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook
  } else {
    workInProgressHook = workInProgressHook.next = newHook
  }

  return workInProgressHook
}

/**
 * 获取函数组件的虚拟 DOM，并设置 hook 执行环境
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树（新Fiber）
 * @param {*} Component 函数组件的函数 () => {}
 * @param {*} props 属性 props
 * @returns 
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  // 将正在构建的 Fiber 树赋值给全局变量 currentlyRenderingFiber
  currentlyRenderingFiber = workInProgress

  // Hook需要在调用 Component 之前
  // 区分挂载/更新阶段，选择 Hooks 的 dispatcher
  if (current !== null && current.memoizedState !== null) {
    ReactCurrentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    ReactCurrentDispatcher.current = HooksDispatcherOnMount
  }

  const children = Component(props)

  // 重置
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null

  return children
}
