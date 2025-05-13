/**
 * 初始化 Fiber 节点更新队列
 * @param {*} fiber Fiber 节点
 */
export const initializeUpdateQueue = (fiber) => {
  const queue = {
    shared: {
      pending: null // 创建一个新的更新队列，pending 是一个循环链表
    }
  }

  fiber.updateQueue = queue
}
