import { FunctionComponent, HostRoot, HostComponent, HostText } from './ReactWorkTags'
import { MutationMask } from './ReactFiberFlags'
import { Placement } from './ReactFiberFlags'
import { appendChild, insertBefore } from 'react-dom-bindings/src/client/ReactDOMHostConfig'

/**
 *  遍历 Fiber 树并在每个 Fiber 上应用副作用
 * @param {*} finishedWork 最新的可展示的 Fiber 树
 * @param {*} root FiberRoot
 */
export const commitMutationEffectsOnFiber = (finishedWork, root) => {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostComponent:
    case HostText:
      recursivelyTraverseMutationEffects(root, finishedWork)
      commitReconciliationEffects(finishedWork)
    default:
      break
  }
}

/**
 * 递归遍历所有子节点并在每个 Fiber 上应用副作用
 * @param {*} root FiberRoot
 * @param {*} parentFiber 
 */
const recursivelyTraverseMutationEffects = (root, parentFiber) => {
  if (parentFiber.subtreeFlags & MutationMask) {
    let { child } = parentFiber
    // 深度递归遍历，实际上所有有副作用的子节点最终会执行 commitReconciliationEffects，这个才是 commitWork 核心
    while (child !== null) {
      commitMutationEffectsOnFiber(child, root)
      child = child.sibling
    }
  }
}

/**
 * 
 * @param {*} finishedWork 最新的可展示的 Fiber 树
 */
const commitReconciliationEffects = (finishedWork) => {
   const { flags } = finishedWork

   // 如果是插入操作
   if (flags & Placement) {
     commitPlacement(finishedWork)
   }
}

/**
 * 
 * @param {*} finishedWork 
 */
const commitPlacement = (finishedWork) => {
  const parentFiber = getHostParentFiber(finishedWork)

  switch (parentFiber.tag) {
    case HostRoot: {
      // 这里的 parent 得到的就是 #root 真实 DOM
      // 在 createFiberRoot 中会关联
      const parent = parentFiber.stateNode.containerInfo
      // 找到要插入的位置，给 insertBefore 确定位置
      const before = getHostSibling(finishedWork)
      insertOrAppendPlacementNode(finishedWork, before, parent)
      break
    }
    case HostComponent: {
      // 这里的 parent 得到的就是父组件关联的真实 DOM
      const parent = parentFiber.stateNode
      // 找到要插入的位置，给 insertBefore 确定位置
      const before = getHostSibling(finishedWork)
      insertOrAppendPlacementNode(finishedWork, before, parent)
      break
    }
  }
}

/**
 * 找到可以挂载的父节点
 * @param {*} fiber 
 * @returns 可以挂载的父节点
 */
const getHostParentFiber = (fiber) => {
  let parent = fiber.return

  // 找到可以挂载的父节点，这里循环是：当节点是函数组件之类的，是不能做挂载容器的，需要继续找上一层父组件
  while (parent !== null) {
    if (isHostParent(parent)) {
      return parent
    }
    parent = parent.return
  }
}

/**
 * ​​查找相邻的 DOM 节点​
 *  - 主要用于 ​​在 Fiber 树中查找当前 Fiber 节点的下一个相邻原生 DOM 节点（HostComponent 或 HostText）​​
 *  - 它的核心目的是 ​​支持 DOM 节点的正确插入或移动​​，尤其是在处理组件更新、插入或重新排序时
 * 
 * 为什么需要这个函数 ：
 *  - 在 DOM 操作中，我们经常需要使用 insertBefore 方法
 *  - 需要知道要插入位置的下一个节点
 *  - 但在 Fiber 树中，兄弟节点不一定对应真实 DOM 节点（可能是组件）
 * 
 * 举例：
 * <div>
 *   <A /> //组件
 *   <p>text</p>
 *   <B /> // 组件
 *   <span>span</span>
 * </div>
 * 如果要插入一个新节点到 <A/> 后面：
 *  - 首先看 <p>
 *  - 如果 <p> 是稳定的 DOM 节点（没有 Placement 标记），就用它
 *  - 1. 如果 <p> 也要插入，就继续找下一个，直到找到稳定的 DOM 节点
 * 
 * 这个函数的确保了 React 在处理 DOM 操作时的严谨性，确保了插入操作的正确性和高效性
 * 
 * @param {*} fiber fiber节点
 * @returns 相邻的 DOM 节点​或者 null
 */
const getHostSibling = (fiber) => {
  let node = fiber

  // 死循环：查找兄弟节点
  sibling: while (true) {
    // 情况 1：如果没有兄弟节点，向上回溯父节点，直到找到有兄弟节点的父节点或到达根节点
    while (node.sibling === null) {
      if (node.return === null || isHostParent(node.return)) {
        return null
      }
      node = node.return
    }

    // 情况 2：找到兄弟节点，继续检查
    node = node.sibling

    // 情况 3：如果兄弟节点不是原生 DOM 节点（如组件、Fragment），继续向下查找
    while (node.tag !== HostComponent && node.tag !== HostText) {
      if (node.flags & Placement) {
        // 如果该节点需要移动（Placement），跳过它（因为它可能还未插入 DOM）
        continue sibling
      } else {
        // 否则，继续向下查找子节点
        node = node.child
      }
    }

    // 情况 4：找到原生 DOM 节点，并且它不需要移动（Placement）
    if (!(node.flags & Placement)) {
      // 返回真实的 DOM 节点
      return node.stateNode;
    }
  }
}

/**
 * 判断是否是根标签(#root) 或者是原生标签
 * @param {*} fiber 
 * @returns 
 */
const isHostParent = (fiber) => {
  return fiber.tag === HostComponent || fiber.tag === HostRoot
}

/**
 * 将节点插入或添加到父节点
 * @param {Fiber} node - Fiber 节点
 * @param {Node} before - 参考节点
 * @param {Node} parent - 父节点
 */
const insertOrAppendPlacementNode = (node, before, parent) => {
  const { tag } = node

  const isHost = (tag === HostComponent || tag === HostText)

  if (isHost) {
    const { stateNode } = node
    // 如果 before 不是 null，那么是将 DOM 节点插入到 before 之前 
    if (before) {
      insertBefore(parent, stateNode, before)
    } else {
      // 否则，直接往父节点追加
      appendChild(parent, stateNode)
    }
  } else {
    // 如果不是 HostComponent 或 HostText（函数组件之类的，组件不能直接挂载），递归处理子节点
    const { child } = node
    if (child !== null) {
      insertOrAppendPlacementNode(child, before, parent)

      // 递归处理兄弟节点（所有兄弟节点都要做处理）
      let { sibling } = child
      while (sibling!== null) {
        insertOrAppendPlacementNode(sibling, before, parent)
        sibling = sibling.sibling
      }
    }
  }
}
