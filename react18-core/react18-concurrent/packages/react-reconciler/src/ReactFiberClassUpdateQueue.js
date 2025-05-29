import assign from 'shared/assign'
import { markUpdateLaneFromFiberToRoot } from './ReactFiberConcurrentUpdates'

export const UpdateState = 0

/**
 * 初始化 Fiber 节点更新队列
 * @param {*} fiber RootFiber 节点
 */
export const initializeUpdateQueue = (fiber) => {
  const queue = {
    shared: {
      pending: null // 创建一个新的更新队列，pending 是一个循环链表
    }
  }

  fiber.updateQueue = queue
}

/**
 * 创建更新对象
 * @returns 更新对象
 */
export const createUpdate = () => {
  const update = {
    tag: UpdateState,
    payload: null, // 存放虚拟 DOM
    next: null
  }

  return update
}

/**
 * 将更新对象添加到 RootFiber 节点的更新队列中
 * 
 * 实现了一个循环链表来管理更新队列，循环链表的优势：
 *  - 不需要遍历到末尾就能插入新节点
 *  - 可以从任意节点开始遍历所有更新
 *  - 方便批量处理多个更新
 * 
 * 这样设计的优点：
 *  - pending 始终指向最后一个更新（尾节点）
 *  - pending.next 始终指向第一个更新（头节点）
 *  - 通过这种方式可以很容易找到更新的开始和结束
 *  - 便于在处理完更新后清空队列
 * 
 * 这种实现方式既保证了更新队列的正确性，又兼顾了性能
 * 在 React 的调度过程中，让更新的处理变得更加高效和可控
 * 
 * @param {*} fiber RootFiber 节点
 * @param {*} update 更新对象
 * @returns FiberRoot 节点
 */
export const enqueueUpdate = (fiber, update) => {
  // updateQueue 会在 createFiberRoot 中初始化
  const updateQueue = fiber.updateQueue
  const pending = updateQueue.shared.pending

  if (pending === null) {
    // 当 pending 为 null，代表第一次更新，update 自己指向自己，形成循环链表
    update.next = update
  } else {
    // 不是第一次更新

    // 将第一个更新放入到 update.next
    update.next = pending.next
    // 将新的更新对象插入到循环链表中
    pending.next = update
  }

  // 最后将 pending 指向最新的更新，形成一个单向循环链表
  updateQueue.shared.pending = update

  // 这个会返回 FiberRoot 节点
  return markUpdateLaneFromFiberToRoot(fiber)
}

/**
 * 根据旧状态和更新队列中的更新计算最新的状态
 * @param {*} workInProgress 需要计算新状态的 Fiber 节点
 */
export const processUpdateQueue = (workInProgress) => {
  // 在 render 函数阶段，就已经通过 enqueueUpdate 处理了更新队列 updateQueue
  // 获取当前 Fiber 节点的更新队列
  const queue = workInProgress.updateQueue
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

    let nextState = workInProgress.memoizedState
    let update = firstPendingUpdate

    // 遍历链表更新队列，根据老状态和更新对象计算新状态
    while (update) {
      nextState = getStateFromUpdate(update, nextState)
      update = update.next
    }

    // 更新 Fiber 的最终状态
    workInProgress.memoizedState = nextState
  }
}

/**
 * 根据老状态和更新对象计算新状态
 * @param {*} update 更新对象
 * @param {*} prevState 老状态
 * @returns 新状态
 */
const getStateFromUpdate = (update, prevState) => {
  switch (update.tag) {
    case UpdateState:
      const { payload } = update

      // 合并 prevState 和 payload 为新状态
      // payload 中是 新的虚拟 DOM
      return assign({}, prevState, payload)
  }
}
