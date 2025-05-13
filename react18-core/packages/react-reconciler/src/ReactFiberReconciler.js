import { createFiberRoot } from './ReactFiberRoot'
import { createUpdate, enqueueUpdate } from './ReactFiberClassUpdateQueue'
import { schedulerUpdateOnFiber } from './ReactFiberWorkLoop'

/**
 * 创建 FiberRoot
 * @param {*} containerInfo 真实 DOM 节点
 * @returns 创建 FiberRoot
 */
export const createContainer = (containerInfo) => {
  return createFiberRoot(containerInfo)
}

/**
 * 更新容器，将虚拟 DOM 转换为真实 DOM 并插入到容器中
 * @param {*} element 虚拟 DOM 节点
 * @param {*} container FiberRoot 节点，FiberRoot.containerInfo 就是根 DOM 节点 root；FiberRoot.current 就是 RootFiber
 */
export const updateContainer = (element, container) => {
  // 拿到 RootFiber
  const current = container.current

  // 创建更新对象
  const update = createUpdate()

  // 将要更新的虚拟 DOM 保存在更新对象 update.payload 中
  update.payload = { element }

  // 将更新对象 update 保存到 RootFiber.updateQueue 中，并返回 RootFiber
  const root = enqueueUpdate(current, update)

  // 调度更新
  schedulerUpdateOnFiber(root)
}
