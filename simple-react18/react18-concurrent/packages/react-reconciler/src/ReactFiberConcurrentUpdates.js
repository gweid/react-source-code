import { HostRoot } from "./ReactWorkTags"

const concurrentQueues = []
let concurrentQueuesIndex = 0

/**
 * 从源 Fiber 向上查找一级，如果找到 RootFiber，最终返回 FiberRoot
 * @param {Fiber} sourceFiber RootFiber 节点
 * @returns 如果找到，则返回 FiberRoot，没找到返回 null
 */
export const markUpdateLaneFromFiberToRoot = (sourceFiber) => {
  let node = sourceFiber
  let parent = sourceFiber.return

  if (parent !== null) {
    node = parent
    parent = parent.return
  }

  if (node.tag === HostRoot) {
    return node.stateNode
  }

  return null
}

/**
 * 从正在构建的 Fiber 向上一直遍历，直到找到 RootFiber，最后返回 FiberRoot
 * @param {*} sourceFiber 正在构建的 Fiber
 * @returns 如果找到，则返回 FiberRoot，没找到返回 null
 */
const getRootForUpdatedFiber = (sourceFiber) => {
  let node = sourceFiber
  let parent = sourceFiber.return

  while (parent !== null) {
    node = parent
    parent = parent.return
  }

  return node.tag === HostRoot ? node.stateNode : null
}


/**
 * 将钩子更新加入并发更新队列
 * 将 fiber, queue, update 存到全局变量 concurrentQueues 中，并拿到 FiberRoot 后返回
 * @param {*} fiber // 正在构建的 Fiber
 * @param {*} queue // 更新队列
 * @param {*} update // 更新对象：{ action, next }
 * @param {*} lane 车道信息
 */
export const enqueueConcurrentHookUpdate = (fiber, queue, update, lane) => {
  enqueueUpdate(fiber, queue, update, lane)

  return getRootForUpdatedFiber(fiber)
}

/**
 * 将类组件更新加入并发更新队列
 * @param {*} fiber // 正在构建的 Fiber
 * @param {*} queue // 更新队列
 * @param {*} update // 更新对象：{ action, next }
 * @param {*} lane 车道信息
 */
export const enqueueConcurrentClassUpdate = (fiber, queue, update, lane) => {
  enqueueUpdate(fiber, queue, update, lane)

  return getRootForUpdatedFiber(fiber)
}

/**
 * 将 fiber, queue, update 存到全局变量 concurrentQueues 中
 * @param {*} fiber // 正在构建的 Fiber
 * @param {*} queue // 更新队列 { pending: null }
 * @param {*} update // 更新对象：{ action, next: null }
 * @param {*} lane 车道信息
 */
const enqueueUpdate = (fiber, queue, update, lane) => {
  // 这里的 concurrentQueuesIndex++ 会不断将 concurrentQueuesIndex + 1
  concurrentQueues[concurrentQueuesIndex++] = fiber
  concurrentQueues[concurrentQueuesIndex++] = queue
  concurrentQueues[concurrentQueuesIndex++] = update
  concurrentQueues[concurrentQueuesIndex++] = lane
}

/**
 * 批量处理并发更新队列​​（在创建 workInProgress （双缓存）树后，beginWork 阶段之前调用）
 * 将多个并发的状态更新（如 useReducer）合并到对应 Fiber 节点的更新队列（queue.pending）中
 * 在 beginWork 阶段，会调用 processUpdateQueue 处理更新队列
 */
export const finishQueueingConcurrentUpdates = () => {
  // 保存当前队列的结束位置，并重置索引
  const endIndex = concurrentQueuesIndex
  concurrentQueuesIndex = 0

  let i = 0

  // 初始化渲染阶段，endIndex 就是 0，不会进入这里面
  while (i < endIndex) {
    // 这里的 i++ 会不断将 i + 1
    const fiber = concurrentQueues[i++] // Fiber 节点
    const queue = concurrentQueues[i++] // 更新队列（如 useState 的 queue）
    const update = concurrentQueues[i++] // 更新对象：{ action, next }
    const lane = concurrentQueues[i++]  // 优先级 Lane

    /**
     * 构建循环链表，两个点：
     *  1、queue.pending 始终指向最新的 Update 对象
     *  2、update.next 始终指向最下一个 Update 对象
     */
    if (queue !== null && update !== null) {
      const pending = queue.pending

      // 构建单向循环链表
      if (pending === null) {
        // pending 为 null，说明是第一个更新（就是第一个 hook）

        // 自引用形成循环
        update.next = update
      } else {
        update.next = pending.next
        pending.next = update
      }

      queue.pending = update
    }
  }
}
