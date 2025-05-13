import { HostRoot } from "./ReactWorkTags"

/**
 * 从源 Fiber 向上遍历树，找到 RootFiber，最终返回 FiberRoot
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
