import { createHostRootFiber } from './ReactFiber'
import { initializeUpdateQueue } from './ReactFiberClassUpdateQueue'

/**
 * FiberRoot 构造函数
 * @param {*} containerInfo 真实 DOM 节点
 */
function FiberRootNode(containerInfo) {
  this.containerInfo = containerInfo
}

/**
 * 创建 FiberRoot 和 RootFiber，并两者进行关联
 * @param {*} containerInfo 真实 DOM 节点
 * @returns FiberRoot
 */
export const createFiberRoot = (containerInfo) => {
  // 创建 FiberRoot：整个应用程序的根节点，也就是应用程序的起点
  const root = new FiberRootNode(containerInfo)

  // 创建未初始化的根 RootFiber：fiber 树的起点，也就是第一个 fiber 节点
  const uninitializedFiber = createHostRootFiber()

  // 将 FiberRoot 和 RootFiber 进行关联
  root.current = uninitializedFiber
  uninitializedFiber.stateNode = root

  // 初始化 RootFiber 的更新队列
  initializeUpdateQueue(uninitializedFiber)

  return root
}
