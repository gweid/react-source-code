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

// 创建更新
export const createUpdate = () => {
  const update = {
    tag: UpdateState,
    payload: null,
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
    // 不是第一次更新，将新的更新对象插入到循环链表中
    update.next = pending.next
    pending.next = update
  }

  // 最后将 pending 指向最新的更新，形成一个单向循环链表
  updateQueue.shared.pending = update

  // 这个会返回 FiberRoot 节点
  return markUpdateLaneFromFiberToRoot(fiber)
}
