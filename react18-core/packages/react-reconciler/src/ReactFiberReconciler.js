import { createFiberRoot } from './ReactFiberRoot'

/**
 * 创建容器，用于将虚拟 DOM 转换为真实 DOM 并插入到容器中
 * @param {*} containerInfo 真实 DOM 节点
 * @returns 创建FiberRoot
 */
export const createContainer = (containerInfo) => {
  return createFiberRoot(containerInfo)
}

export const updateContainer = (element, container) => {
  
}
