import objectIs from 'shared/objectIs'
import ReactSharedInternals from 'shared/ReactSharedInternals'
import { enqueueConcurrentHookUpdate } from './ReactFiberConcurrentUpdates'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
import { Passive as PassiveEffect } from './ReactFiberFlags'
import { HasEffect as HookHasEffect, Passive as HookPassive } from './ReactHookEffectTags'

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
  useReducer: mountReducer,
  useState: mountState,
  useEffect: mountEffect
}

// 更新阶段的 Hook
const HooksDispatcherOnUpdate = {
  useReducer: updateReducer,
  useState: updateState,
  useEffect: updateEffect
}


function basicStateReducer(state, action) {
  // action 就是 setState 的参数，判断传入的是 值 还是 函数
  // setNum(2)
  // setNum((prev) => prev + 1)
  return typeof action === 'function' ? action(state) : action
}

/**
 * 挂载阶段的 useReducer
 * @param {*} reducer reducer 函数
 * @param {*} initialArg 初始值
 * @returns [state, dispatch]
 */
function mountReducer(reducer, initialArg) {
  const hook = mountWorkInProgressHook()

  // 将初始值赋值给 memoizedState
  hook.memoizedState = initialArg

  const queue = {
    pending: null, // 指向最新的 update 对象
    dispatch: null, // 调度器
    lastRenderedState: initialArg // 上一次渲染的 state
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
 * @returns [state, dispatch]
 */
function updateReducer(reducer) {
  const hook = updateWorkInProgressHook()

  // queue 和 update 关系，在函数 finishQueueingConcurrentUpdates 中建立
  const queue = hook.queue
  const current = currentHook // 拿到正在复用的旧 Hook 节点
  const pendingQueue = queue.pending // 当前最新的 update 对象

  // 获取老的值
  let newState = current.memoizedState

  if (pendingQueue !== null) {
    queue.pending = null

    // 记录第一个 update 对象，给后面比较用，主要是为了打断循环，避免无限循环
    const firstUpdate = pendingQueue.next

    let update = firstUpdate

    do {
      const action = update.action
      newState = reducer(newState, action)
      update = update.next
    } while (update !== null && update !== firstUpdate)
  }

  hook.memoizedState = newState

  // 将新值存储到 queue.lastRenderedState，便于在下次更新前，做比对
  queue.lastRenderedState = newState

  // queue.dispatch 在 mountReducer 中赋值
  const dispatch = queue.dispatch

  return [hook.memoizedState, dispatch]
}

/**
 * 挂载阶段的 useState
 * @param {*} initialState 初始值
 * @returns [state, dispatch]
 */
function mountState(initialState) {
  const hook = mountWorkInProgressHook()

  hook.memoizedState = initialState

  /**
   * lastRenderedState 和 lastRenderedReducer 主要用来做优化
   * 用于在更新时比较新旧 state，避免不必要的渲染
   */
  const queue = {
    pending: null, // 指向最新的 update 对象
    dispatch: null, // 调度器
    lastRenderedState: initialState, // 上一次渲染的 state
    lastRenderedReducer: basicStateReducer // 上一次渲染的 reducer
  }
  hook.queue = queue

  const dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue)

  return [hook.memoizedState, dispatch]
}

/**
 * 更新阶段的 useState
 * @returns [state, dispatch]
 */
function updateState() {
  return updateReducer(basicStateReducer)
}

/**
 * 挂载阶段的 useEffect
 * @param {*} create 副作用函数
 * @param {*} deps 依赖数组
 */
function mountEffect(create, deps) {
  return mountEffectImpl(PassiveEffect, HookPassive, create, deps)
}

/**
 * 更新阶段的 useEffect
 * @param {*} create 副作用函数
 * @param {*} deps 依赖数组
 */
function updateEffect(create, deps) {
  return updateEffectImpl(PassiveEffect, HookPassive, create, deps)
}


/**
 * 抽离便于复用，useEffect 和 useLayoutEffect 都使用，主要是传参的区别
 * @param {*} fiberFlags 标记当前 ​​Fiber 节点​​ 需要执行的副作用类型，在 commit 阶段（DOM 更新阶段），React 会根据 fiberFlags 决定如何处理副作用
 * @param {*} hookFlags 标记当前 ​​Hook​​ 的副作用类型和调度优先级
 * @param {*} create 副作用函数
 * @param {*} deps 依赖数组
 */
const mountEffectImpl = (fiberFlags, hookFlags, create, deps) => {
  const hook = mountWorkInProgressHook()

  const nextDeps = deps === undefined ? null : deps

  /**
   * currentlyRenderingFiber 当前正在构建的 Fiber，在 renderWithHooks 中赋值
   * 给 Fiber.flags 打上 副作用 标识，便于 commitWork 阶段使用
   * 这一步是关键
   * 如果没有标记 fiberFlags，那么在 commitWork 阶段，就不会对 Fiber 进行操作
   */
  currentlyRenderingFiber.flags |= fiberFlags

  /**
   * HookHasEffect | hookFlags 是组合标记：
   * 根据不同的 Effect 类型，hookFlags 可能包含以下标记之一
   *  const HookPassive = 0b100 // useEffect 标记 (二进制: 100)
   *  const HookLayout = 0b010 // useLayoutEffect 标记 (二进制: 010)
   * 
   * 所以执行 HookHasEffect | hookFlags 位运算，会得到不同结果：
   *  HookHasEffect | HookPassive =  0b0001 | 0b100 = 0b101 // 十进制: 5，表示 useEffect 副作用
   *  HookHasEffect | HookLayout = 0b0001 | 0b010 = 0b011 // 十进制: 3，表示 useLayoutEffect 副作用
   */
  // hook.memoizedState 指向一个 effect
  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    undefined,
    nextDeps
  )
}

/**
 * 抽离便于复用，useEffect 和 useLayoutEffect 都使用，主要是传参的区别
 * 
 * @param {*} fiberFlags 标记当前 ​​Fiber 节点​​ 需要执行的副作用类型，在 commit 阶段（DOM 更新阶段），React 会根据 fiberFlags 决定如何处理副作用
 * @param {*} hookFlags 标记当前 ​​Hook​​ 的副作用类型和调度优先级
 * @param {*} create 副作用函数
 * @param {*} deps 依赖数组
 */
const updateEffectImpl = (fiberFlags, hookFlags, create, deps) => {
  const hook = updateWorkInProgressHook()

  const nextDeps = deps === undefined ? null : deps

  let destroy

  if (currentHook !== null) {
    // 拿到当前正在复用的旧 Hook 节点的 effect 对象
    const prevEffect = currentHook.memoizedState

    // 这个 prevEffect.destroy 在 mountEffectImpl 中是没有赋值的
    // 需要在初始化渲染走到 commitWork 阶段执行一次副作用函数 create 才会拿到赋值
    // 此时是更新阶段，所以这里可以拿到
    destroy = prevEffect.destroy

    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps

      // 如果依赖没有变化
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memoizedState = pushEffect(hookFlags, create, destroy, nextDeps)
        return
      }
    }
  }

  /**
   * 这一步是关键
   * 如果没有标记 fiberFlags，那么在 commitWork 阶段，就不会对 Fiber 进行操作
   * 所以上面的 如果依赖没有变化，是不会添加这一个标记的
   */
  currentlyRenderingFiber.flags |= fiberFlags

  hook.memoizedState = pushEffect(
    HookHasEffect | hookFlags,
    create,
    destroy,
    nextDeps
  )
}

/**
 * 判断依赖是否相等
 * @param {*} nextDeps 新的依赖数组
 * @param {*} prevDeps 旧的依赖数组
 * @returns 相等返回 true，不相等返回 false
 */
const areHookInputsEqual = (nextDeps, prevDeps) => {
  if (prevDeps === null) {
    return null
  }

  for (let i =0; i < prevDeps.length && nextDeps.length; i++) {
    if (objectIs(nextDeps[i], prevDeps[i])) {
      continue
    }
    return false
  }

  return true
}

/**
 * 创建 effect 对象，并形成链表
 * @param {*} tag 副作用类型：useEffect 副作用 | useLayoutEffect 副作用
 * @param {*} create 副作用函数
 * @param {*} destroy 销毁函数
 * @param {*} deps 依赖数组
 * @returns 副作用对象
 */
const pushEffect = (tag, create, destroy, deps) => {
  const effect = {
    tag,
    create,
    destroy,
    deps,
    next: null
  }

  // 最开始，这个 currentlyRenderingFiber：正在构建的 Fiber 树，就是 这个函数组件
  // 注意不是 RootFiber，所以初始化的时候，updateQueue 会是 null
  let componentUpdateQueue = currentlyRenderingFiber.updateQueue

  if (componentUpdateQueue === null) {
    // 创建一个函数组件更新对象，并赋值给 currentlyRenderingFiber.updateQueue
    componentUpdateQueue = createFunctionComponentUpdateQueue()
    currentlyRenderingFiber.updateQueue = componentUpdateQueue

    // 自引用形成链表，lastEffect 指向最新 effect
    componentUpdateQueue.lastEffect = effect.next = effect
  } else {
    const lastEffect = componentUpdateQueue.lastEffect

    if (lastEffect === null) {
      // 虽然经过外面的 if 判断 updateQueue 已存在，但是会有一些边界条件：
      //  - 开发模式下热更新（HMR）​​导致队列被部分重置
      //  - 并发渲染中断恢复​​后队列状态不一致
      // 所以这里进行多一次关联
      componentUpdateQueue.lastEffect = effect.next = effect
    } else {
      /**
       * 所有 effect 对象会形成一个独立链表，与 hook 链表不一致
       * 构建 effect 链表，next 指向下一个 effect，lastEffect 始终指向最新的 effect
       * 比如初始化多个 useEffect，那么链表如下：
       *  effect1 --next--> effect2 --next--> effect3 --next--> effect1
       */
      const firstEffect = lastEffect.next
      lastEffect.next = effect
      effect.next = firstEffect
      componentUpdateQueue.lastEffect = effect
    }
  }

  return effect
}

/**
 * 创建函数组件更新队列
 * @returns 
 */
const createFunctionComponentUpdateQueue = () => {
  return {
    // 最新的副作用
    lastEffect: null
  }
}


/**
 * useReducer 调度（dispatch）函数
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
 * useState 调度（dispatch）函数
 * @param {*} fiber fiber 节点
 * @param {*} queue 更新队列
 * @param {*} action 更新动作
 */
const dispatchSetState = (fiber, queue, action) => {
  const update = {
    action,
    hasEagerState: false, // 是否有急切的状态
    eagerState: null, // 急切的状态值
    next: null
  }

  const { lastRenderedReducer, lastRenderedState } = queue

  // action 就是 setState 的参数，可能是 值 或者 函数
  const eagerState = lastRenderedReducer(lastRenderedState, action)
  update.hasEagerState = true
  update.eagerState = eagerState

  // 优化：如果值一样，就不需要更新
  if (objectIs(eagerState, lastRenderedState)) {
    return
  }

  const root = enqueueConcurrentHookUpdate(fiber, queue, update)

  scheduleUpdateOnFiber(root)
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
    // 依赖 next 形成链表，比如初始化多个 hook：hook1 -> hook2 -> hook3
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
  // currentHook 当前正在复用的旧 Hook 节点​​
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

  // 新 Hook，实际上就是用的老 hook 的属性值，进行复用
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
 * 调用函数组件，获取函数组件的虚拟 DOM，并设置 hook 执行环境
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树（新Fiber）
 * @param {*} Component 函数组件的函数 () => {}
 * @param {*} props 属性 props
 * @returns 虚拟 DOM
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  // 将正在构建的 Fiber 树赋值给全局变量 currentlyRenderingFiber
  currentlyRenderingFiber = workInProgress

  // 函数组件的 workInProgress.updateQueue 主要存储 effect 对象
  workInProgress.updateQueue = null

  // Hook 使用之前，需要先定义，Component 执行就是执行函数组件，里面会执行 hook
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
