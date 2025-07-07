import assign from 'shared/assign'
import { enqueueConcurrentClassUpdate } from './ReactFiberConcurrentUpdates'
import { NoLanes, mergeLanes, isSubsetOfLanes } from './ReactFiberLane'

export const UpdateState = 0

/**
 * 初始化 Fiber 节点更新队列（createRoot 过程 createFiberRoot 中调用）
 * @param {*} fiber RootFiber 节点
 */
export const initializeUpdateQueue = (fiber) => {
  const queue = {
    baseState: fiber.memoizedState, // 本次更新前该 Fiber 节点的 state，此后的计算是基于该 state 计算更新后的 state
    firstBaseUpdate: null, // 上次渲染时遗留下来的低优先级任务会组成一个链表，该字段指向到该链表的头节点
    lastBaseUpdate: null, // 上次渲染时遗留下来的低优先级任务会组成一个链表，该字段指向到该链表的尾节点
    shared: { // 本次渲染时要执行的任务，会存放在shared.pending中，这里是环形链表，更新时，会将其拆开，链接到 lastBaseUpdate 的后面
      pending: null // 创建一个新的更新队列，pending 是一个循环链表
    }
  }

  // 将更新队列挂载到 fiber 节点上 updateQueue 属性上
  fiber.updateQueue = queue
}

/**
 * 创建更新对象（在 render 流程 updateContainer 中用到）
 * @returns 更新对象
 */
export const createUpdate = (lane) => {
  const update = {
    lane,
    tag: UpdateState,
    payload: null, // 存放虚拟 DOM
    next: null
  }

  return update
}

/**
 * 将更新对象、Lane 等信息添加到全局队列 concurrentQueues中（在 render 流程 updateContainer 中用到）
 * 
 * @param {*} fiber RootFiber 节点
 * @param {*} update 更新对象
 * @param {*} lane 车道信息
 * @returns FiberRoot 节点
 */
export const enqueueUpdate = (fiber, update, lane) => {
  // updateQueue 会在 createFiberRoot 中初始化
  const updateQueue = fiber.updateQueue
  const sharedQueue = updateQueue.shared

  // 原始版是通过链表（可以查看react18-basic），Lane 版本是通过 Lane 来管理更新
  return enqueueConcurrentClassUpdate(fiber, sharedQueue, update, lane)
}

/**
 * 处理更新队列，根据旧状态和更新队列中的更新计算最新的状态
 * 最后 workInProgress.memoizedState 中会挂载 element 结构
 * 
 * 在 beginWork 阶段的, 如果是 HostRoot 类型，beginWork 阶段通过 updateHostRoot 函数调用 processUpdateQueue
 * @param {*} workInProgress 需要计算新状态的 Fiber 节点
 * @param {*} nextProps 新的 props
 * @param {*} renderLanes 渲染车道（当前渲染需要处理的优先级）
 */
export const processUpdateQueue = (workInProgress, nextProps, renderLanes) => {
  // 在 render 函数阶段，就已经通过 enqueueUpdate 处理了更新队列 updateQueue
  // 获取当前 Fiber 节点的更新队列
  const queue = workInProgress.updateQueue

  // firstBaseUpdate 和 lastBaseUpdate 在 initializeUpdateQueue 初始化更新队列的时候添加了
  let firstBaseUpdate = queue.firstBaseUpdate
  let lastBaseUpdate = queue.lastBaseUpdate
  const pendingQueue = queue.shared.pending

  // 如果有待处理的更新
  if (pendingQueue !== null) {
    // render 阶段通过 enqueueUpdate 函数创建更新队列使用了单向循环链表
    // pending 指向最后一个更新，它的 next 即 pending.next 指向指向第一个更新

    // 取出最后一个更新
    const lastPendingUpdate = pendingQueue
    // 取出第一个更新
    const firstPendingUpdate = lastPendingUpdate.next

    // 处理好后，将 pending 指向 null，清空 pending 队列
    queue.shared.pending = null

    // 断开循环链表，准备处理更新
    // 为什么需要断开循环链表？
    // 一开始为单向环形链表：A → B → C → A，如果直接遍历环形链表而不断开：A → B → C → A → B → C → ...（无限循环）
    // 断开循环链表：A → B → C → null，链表变为单向链表，不会无限循环
    lastPendingUpdate.next = null

    /**
     * 要理解这段代码，首先了解两个概念
     *  - pendingQueue：新加入的、尚未处理的更新（当前渲染周期产生的更新）
     *  - baseUpdate：已积累的更新队列（就是上一次渲染周期中未处理完的更新）
     * 
     * 作用​​：将 pendingQueue 的更新追加到 baseUpdate 队列的末尾，保持更新顺序
     * 
     * 
     * 
     * 使用两个更新队列，并最后合并到 baseUpdate：
     *  - 更新连续性保证：确保了 React 的更新是连续的，即使在中断渲染后恢复，也能保证所有更新按正确顺序处理
     * 
     *  - 优先级系统的支持：更新可能有不同的优先级，通过链表结构，React 可以：
     *     - 保存低优先级更新，等待后续处理
     *     - 插入高优先级更新，优先处理
     *     - 在处理完高优先级更新后，继续处理低优先级更新
     * 
     *  - 中断与恢复机制：在 React 的并发模式中，渲染工作可能被中断。这段代码确保
     *     - 中断前已处理的更新不会丢失
     *     - 中断时未处理的更新会被保存在 baseUpdate 链表中
     *     - 恢复渲染时，可以从中断点继续处理
     * 
     * 
     * 
     * 场景一：批量更新
     *  - 多个 setState 触发的更新会被合并到 pendingQueue，最终统一处理
     * 
     * 场景二：连续的状态更新
     * 当用户快速点击按钮多次，触发多次状态更新时，React 会创建三个更新对象，通过链表连接起来，确保它们按顺序处理
     */
    if (lastBaseUpdate === null) {
      // 当没有积累的更新时，将 pendingQueue 的第一个更新作为第一个积累的更新
      firstBaseUpdate = firstPendingUpdate
    } else {
      // 当有积累的更新时，将 pendingQueue 的第一个更新追加到积累的更新队列的末尾
      lastBaseUpdate.next = firstPendingUpdate
    }

    // 将 pendingQueue 的最后一个更新作为最后一个积累的更新
    lastBaseUpdate = lastPendingUpdate
  }

  // 如果存在积累的更新，则需要处理这些更新
  if (firstBaseUpdate !== null) {
    let newState = queue.baseState
    let newLanes = NoLanes
    let newBaseState = null
    let newFirstBaseUpdate = null
    let newLastBaseUpdate = null

    let update = firstBaseUpdate
    
    do {
      // createUpdate 初始化 update 对象的时候，会有 lane
      const updateLane = update.lane

      /**
       * isSubsetOfLanes(renderLanes, updateLane)表示：updateLane 是 renderLanes 的子集
       * 但是这里取反了，所以：
       *  - 如果 updateLane 是 renderLanes 的子集，则不处理这次更新
       *  - 如果 updateLane 不是 renderLanes 的子集，则处理这次更新
       * 
       * 表示：如果这次更新优先级（renderLanes）不在当前渲染优先级（renderLanes）内，那么这次不做处理，但是需要保存到 baseUpdate 中
       */
      if (!isSubsetOfLanes(renderLanes, updateLane)) {

        /**
         * 若当前 update 的操作的优先级不够。跳过此更新
         * 将该 update 放到新的队列中，为了保证链式操作的连续性，下面 else 逻辑中已经可以执行的 update，也放到这个队列中
         */
        const clone = {
          id: update.id,
          lane: updateLane,
          tag: update.tag,
          payload: update.payload,
          next: null
        }
        
        if (newLastBaseUpdate === null) {
          newFirstBaseUpdate = newLastBaseUpdate = clone
          newBaseState = newState
        } else {
          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }

        newLanes = mergeLanes(newLanes, updateLane)
      } else {
        // 如果这次更新优先级（renderLanes）在当前渲染优先级（renderLanes）内，需要进行更新

        if (newLastBaseUpdate !== null) {
          /**
           * 若存储低优先级的更新链表不为空，则为了操作的完整性，即使当前 update 会执行
           * 也将当前的 update 节点也拼接到后面
           */
          const clone = {
            id: update.id,
            lane: 0,
            tag: update.tag,
            payload: update.payload,
            next: null
          }

          newLastBaseUpdate = newLastBaseUpdate.next = clone
        }
        
        newState = getStateFromUpdate(update, newState)
      }

      update = update.next
    } while (update)

    if (newLastBaseUpdate === null) {
      newBaseState = newState
    }

    queue.baseState = newBaseState
    queue.firstBaseUpdate = newFirstBaseUpdate
    queue.lastBaseUpdate = newLastBaseUpdate

    workInProgress.lanes = newLanes
    workInProgress.memoizedState = newState
  }
}

/**
 * 根据老状态和更新对象计算新状态
 * @param {*} update 更新对象
 * @param {*} prevState 老状态
 * @param {*} nextProps 新的 props
 * @returns 新状态
 */
const getStateFromUpdate = (update, prevState, nextProps) => {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update

      let partialState

      if (typeof payload === 'function') {
        partialState = payload.call(null, prevState, nextProps)
      } else {
        partialState = payload
      }

      // 合并 prevState 和 payload 为新状态
      // payload 中是 新的虚拟 DOM
      return assign({}, prevState, payload)
  }
}
