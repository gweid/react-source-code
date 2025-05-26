import { FunctionComponent, HostRoot, HostComponent, HostText } from './ReactWorkTags'
import { MutationMask } from './ReactFiberFlags'
import { Placement, Update, Passive, LayoutMask } from './ReactFiberFlags'
import {
  HasEffect as HookHasEffect,
  Passive as HookPassive,
  Layout as HookLayout
} from './ReactHookEffectTags'
import { appendChild, insertBefore, commitUpdate } from 'react-dom-bindings/src/client/ReactDOMHostConfig'

/**
 *  遍历 Fiber 树并在每个 Fiber 上应用副作用（commitWork 阶段核心入口函数）
 * @param {*} finishedWork 最新的可展示的 Fiber 树
 * @param {*} root FiberRoot
 */
export const commitMutationEffectsOnFiber = (finishedWork, root) => {
  const current = finishedWork.alternate // 老 Fiber
  const flags = finishedWork.flags

  switch (finishedWork.tag) {
    case FunctionComponent:
    case HostRoot:
    case HostText:
      recursivelyTraverseMutationEffects(root, finishedWork)
      commitReconciliationEffects(finishedWork)

      // 更新阶段......
      break
    case HostComponent:
      recursivelyTraverseMutationEffects(root, finishedWork)
      commitReconciliationEffects(finishedWork)

      /**
       * 如果 flags 中包含 Update，那么进入更新
       * 这里的更新，是更新属性，因为标签在 commitReconciliationEffects 已经做了插入
       * 
       * 什么时候打上的 Update 标记？在 completeWork 阶段通过函数 markUpdate 添加
       */
      if (flags & Update) {
        const instance = finishedWork.stateNode

        if (instance !== null) {
          const newProps = finishedWork.memoizedProps
          const oldProps = current !== null ? current.memoizedProps : newProps
          const type = finishedWork.type

          // updatePayload 在 completeWork 阶段通过函数 prepareUpdate 调用 diffProperties 函数添加
          const updatePayload = finishedWork.updateQueue
          finishedWork.updateQueue = null // 清空 updateQueue

          if (updatePayload) {
            commitUpdate(instance, updatePayload, type, oldProps, newProps, finishedWork)
          }
        }
      }
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
 * 真实 DOM 渲染到页面
 * @param {*} finishedWork 最新的可展示的 Fiber 树
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
      while (sibling !== null) {
        insertOrAppendPlacementNode(sibling, before, parent)
        sibling = sibling.sibling
      }
    }
  }
}

/**
 * 执行 useEffect 销毁函数
 * @param {*} finishedWork RootFiber
 */
export const commitPassiveUnmountEffects = (finishedWork) => {
  commitPassiveUnmountOnFiber(finishedWork)
}

/**
 * 执行 useEffect 副作用函数
 * @param {*} root FiberRoot
 * @param {*} finishedWork RootFiber
 */
export const commitPassiveMountEffects = (root, finishedWork) => {
  commitPassiveMountOnFiber(root, finishedWork)
}

/**
 * 执行 useEffect 销毁函数
 * @param {*} finishedWork RootFiber
 */
const commitPassiveUnmountOnFiber = (finishedWork) => {
  const flags = finishedWork.flags

  // 只有函数组件才需要处理 useEffect 销毁函数
  switch (finishedWork.tag) {
    case HostRoot:
      recursivelyTraversePassiveUnmountEffects(finishedWork)
      break
    case FunctionComponent:
      // 递归处理所有子节点
      recursivelyTraversePassiveUnmountEffects(finishedWork)

      // 如果当前函数 Fiber 的 flags 被标记有副作用
      if (flags & Passive) {
        commitHookPassiveUnmountEffects(finishedWork, HookHasEffect | HookPassive)
      }
      break
  }
}

// 循环遍历所有子节点，递归调用 commitPassiveUnmountOnFiber
const recursivelyTraversePassiveUnmountEffects = (parentFiber) => {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child

    while (child !== null) {
      commitPassiveUnmountOnFiber(child)
      child = child.sibling
    }
  }
}

/**
 * 执行 useEffect 销毁函数
 *  这里的 finishedWork 函数组件的 Fiber 节点
 *  因为上面是在 case FunctionComponent 分支调用的 commitHookPassiveUnmountEffects
 * @param {*} finishedWork 函数组件的 Fiber 节点
 * @param {*} hookFlags hook 副作用标识
 */
const commitHookPassiveUnmountEffects = (finishedWork, hookFlags) => {
  commitHookEffectListUnmount(hookFlags, finishedWork)
}

/**
 * 执行 useEffect | useLayoutEffect 销毁函数
 *  这里的 finishedWork 函数组件的 Fiber 节点
 *  因为上面是在 case FunctionComponent 分支调用的 commitHookPassiveUnmountEffects
 * @param {*} flags hook 副作用标识
 * @param {*} finishedWork 函数组件的 Fiber 节点
 */
const commitHookEffectListUnmount = (flags, finishedWork) => {
  // 拿到副作用 effect 链表
  const updateQueue = finishedWork.updateQueue

  // 拿到最新的副作用
  const lastEffect = updateQueue.lastEffect !== null ? updateQueue.lastEffect : null

  if (lastEffect !== null) {
    // 链表结构：effect1 --next--> effect2 --next--> effect3 --next--> effect1
    // lastEffect 永远指向最新的 effect，所以这里的 lastEffect.next 就是第一个 effect
    const firstEffect = lastEffect.next

    let effect = firstEffect

    do {
      /**
       * 如果当前 effect 的 tag 与 flags 匹配，说明当前 effect 需要执行销毁函数
       * 
       * effect 的 tag 有两种情况:
       *  - HookPassive 这种情况是依赖数组不变，不需要重新执行销毁函数
       *  - HookHasEffect | HookPassive 这种情况是依赖数组变化、或者依赖数组是空、或者没有依赖数组
       */
      if ((effect.tag & flags) === flags) {
        const destroy = effect.destroy

        // 两种情况：
        //  1.初始化阶段是不会有 destroy
        //  2.更新阶段是会有 destroy，判断有没有定义了 destroy
        if (destroy !== undefined) {
          destroy()
        }
      }
      effect = effect.next
    } while (effect !== firstEffect)
  }
}

/**
 * 执行 useEffect 副作用函数
 * @param {*} root FiberRoot
 * @param {*} finishedWork RootFiber
 */
const commitPassiveMountOnFiber = (finishedRoot, finishedWork) => {
  const flags = finishedWork.flags

  switch (finishedWork.tag) {
    case HostRoot:
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork)
      break
    case FunctionComponent:
      recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork)

      // 如果当前 Fiber 的 flags 被标记有副作用
      if (flags & Passive) {
        commitHookPassiveMountEffects(finishedWork, HookHasEffect | HookPassive)
      }
      break
  }
}

// 循环遍历所有子节点，递归调用 commitPassiveMountOnFiber
const recursivelyTraversePassiveMountEffects = (root, parentFiber) => {
  if (parentFiber.subtreeFlags & Passive) {
    let child = parentFiber.child;
    while (child !== null) {
      commitPassiveMountOnFiber(root, child);
      child = child.sibling;
    }
  }
}

/**
 * 执行 useEffect 副作用函数
 * @param {*} finishedWork 函数组件的 Fiber 节点
 * @param {*} hookFlags hook 副作用标识
 */
const commitHookPassiveMountEffects = (finishedWork, hookFlags) => {
  commitHookEffectListMount(hookFlags, finishedWork)
}

/**
 * 执行 useEffect | useLayoutEffect 副作用函数
 * @param {*} flags hook 副作用标识
 * @param {*} finishedWork 函数组件的 Fiber 节点
 */
const commitHookEffectListMount = (flags, finishedWork) => {
  const updateQueue = finishedWork.updateQueue

  const lastEffect = updateQueue.lastEffect !== null ? updateQueue.lastEffect : null

  if (lastEffect !== null) {
    // 链表结构：effect1 --next--> effect2 --next--> effect3 --next--> effect1
    // lastEffect 永远指向最新的 effect，所以这里的 lastEffect.next 就是第一个 effect
    const firstEffect = lastEffect.next

    let effect = firstEffect

    /**
     * 如果当前 effect 的 tag 与 flags 匹配，说明当前 effect 需要执行销毁函数
     * 
     * effect 的 tag 有两种情况:
     *  - HookPassive 这种情况是依赖数组不变，不需要重新执行销毁函数
     *  - HookHasEffect | HookPassive 这种情况是依赖数组变化、或者依赖数组是空、或者没有依赖数组
     */
    do {
      if ((effect.tag & flags) === flags) {
        const create = effect.create
        // 执行副作用函数，得到 销毁函数，保存 effect，待下次执行 副作用函数之前执行 这个销毁函数
        effect.destroy = create()
      }
      effect = effect.next
    } while (effect !== firstEffect)
  }
}

/**
 * 执行 useLayoutEffect 副作用函数
 * @param {*} finishedWork RootFiber
 * @param {*} root FiberRoot
 */
export const commitLayoutEffects = (finishedWork, root) => {
  // 这拿到的是老 Fiber
  const current = finishedWork.alternate
  commitLayoutEffectOnFiber(root, current, finishedWork)
}

/**
 * 执行 useLayoutEffect 副作用函数
 * @param {*} finishedRoot FiberRoot
 * @param {*} current 老 Fiber
 * @param {*} finishedWork 新 Fiber
 */
const commitLayoutEffectOnFiber = (finishedRoot, current, finishedWork) => {
  const flags = finishedWork.flags

  switch (finishedWork.tag) {
    case HostRoot:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork)
      break
    case FunctionComponent:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork)

      if (flags & LayoutMask) {
        commitHookLayoutEffects(finishedWork, HookHasEffect | HookLayout)
      }
      break
  }
}

// 递归遍历所有子节点，执行 useLayoutEffect 副作用函数
const recursivelyTraverseLayoutEffects = (root, parentFiber) => {
  if (parentFiber.subtreeFlags & LayoutMask) {
    let child = parentFiber.child

    while (child !== null) {
      const current = child.alternate;
      commitLayoutEffectOnFiber(root, current, child)
      child = child.sibling
    }
  }
}

/**
 * 执行 useLayoutEffect 副作用函数
 * @param {*} finishedWork 函数组件的 Fiber 节点
 * @param {*} hookFlags hook 副作用标识
 */
const commitHookLayoutEffects = (finishedWork, hookFlags) => {
  // 执行销毁函数
  commitHookEffectListUnmount(hookFlags, finishedWork)

  // 执行副作用函数
  commitHookEffectListMount(hookFlags, finishedWork)
}
