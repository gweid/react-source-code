import {
  createInstance,
  createTextInstance,
  appendInitialChild,
  finalizeInitialChildren,
  prepareUpdate
} from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { NoFlags, Update } from "./ReactFiberFlags"
import { HostComponent, HostRoot, HostText, FunctionComponent } from "./ReactWorkTags"

/**
 * 将 Fiber 转换为真实 DOM 节点
 * @param {*} current 旧的 Fiber 树
 * @param {*} workInProgress 新的 Fiber 树
 */
export const completeWork = (current, workInProgress) => {
  const newProps = workInProgress.pendingProps

  switch (workInProgress.tag) {
    case HostRoot:
      // HostRoot 就是 react 挂载的 根节点 #root
      // 所以不需要创建真实 DOM 节点，只做 subtreeFlags 标记
      bubbleProperties(workInProgress)
      break;
    case HostComponent:
      // 原生标签
      const { type } = workInProgress

      if (current !== null && workInProgress.stateNode !== null) {
        // 如果是更新阶段
        updateHostComponent(current, workInProgress, type, newProps)
      } else {
        // 初始化阶段

        // 创建真实 DOM 节点
        const instance = createInstance(type, newProps, workInProgress)
  
        // 内部做循环，把所有子 DOM 追加到 父 DOM 上
        // 这里为什么可以这样？因为按照 completeWork 流程，先处理子节点，再回溯到父节点
        // 所以这里可以拿到所有子节点的真实 DOM 节点
        appendAllChildren(instance, workInProgress)
  
        // 将真实 DOM 关联到 stateNode 属性
        workInProgress.stateNode = instance
  
        // 为 DOM 元素设置属性
        finalizeInitialChildren(instance, type, newProps)
      }

      // 做 subtreeFlags 标记
      bubbleProperties(workInProgress)
      break;
    case FunctionComponent:
      // 函数组件
      // 函数组件的标签是不需要创建 DOM 节点的，只做 subtreeFlags 标记
      bubbleProperties(workInProgress)
      break;
    case HostText:
      // 文本节点
      const newText = newProps
      // Fiber 中，stateNode 属性关联真实 DOM 
      workInProgress.stateNode = createTextInstance(newText)
      // 做 subtreeFlags 标记
      bubbleProperties(workInProgress)
      break;
  }
}

/**
 * 标记更新
 * @param {*} workInProgress 新的 Fiber 树
 */
const markUpdate = (workInProgress) => {
  workInProgress.flags |= Update
}

/**
 * 更新阶段：生成更新描述，打上更新标记，便于 commitWork 阶段使用
 * @param {*} current 旧的 Fiber 树
 * @param {*} workInProgress 新的 Fiber 树
 * @param {*} type 原生标签类型
 * @param {*} newProps 新的 props
 */
const updateHostComponent = (current, workInProgress, type, newProps) => {
  const oldProps = current.memoizedProps
  const instance = workInProgress.stateNode // 获取真实 DOM

  // 生成更新描述 updatePayload
  const updatePayload = prepareUpdate(instance, type, oldProps, newProps)

  // 将更新描述放到新 Fiber 的 updateQueue 属性上
  workInProgress.updateQueue = updatePayload

  if (updatePayload) {
    // 打上更新标记，用于 commitWork 阶段使用
    markUpdate(workInProgress)
  }
}

/**
 * 冒泡处理 subtreeFlags 属性
 * 如果子节点或【子节点的子节点】需要插入（Placement）、更新（Update）或删除（Deletion）
 * 父节点的 subtreeFlags 会通过位运算记录这些操作
 * 
 * @param {*} completeWork Fiber 节点
 */
const bubbleProperties = (completeWork) => {
  let subtreeFlags = NoFlags
  // 拿到子节点
  let child = completeWork.child

  // 遍历自己下一层级的所有 子节点，并合并标记
  while (child !== null) {
    // |= 是位运算符，用于添加标记，不会影响其他已有的标记
    subtreeFlags |= child.subtreeFlags // 合并子节点的标记（相对于 child 是子节点，相对于 completeWork 是孙节点）
    subtreeFlags |= child.flags // 合并当前节点的标记
    child = child.sibling
  }

  // 更新父节点的子节点标记
  completeWork.subtreeFlags = subtreeFlags
}

/**
 * 为父节点追加真实子 DOM
 * 
 * @param {*} parent 父 DOM
 * @param {*} workInProgress 父 Fiber 节点
 */
const appendAllChildren = (parent, workInProgress) => {
  let node = workInProgress.child

  while (node) {
    if (node.tag === HostComponent || node.tag === HostText) {
      // 这里为什么可以这样？因为按照 completeWork 流程，先处理子节点，再回溯到父节点
      // 所以这里可以拿到所有子节点的真实 DOM 节点
      appendInitialChild(parent, node.stateNode)
    } else if (node.child !== null) {
      /**
       * 如果当前节点不是 HostComponent 或 HostText 类型，比如函数组件、类组件等，本身不会直接渲染为 DOM 节点
       * 
       * 比如下面的结构：
       * 
       * <div>
       *   <MyComponent>
       *     <span>Hello</span>
       *   </MyComponent>
       *   <p>World</p>
       * </div>
       * 
       * - MyComponent 不是 DOM 节点，所以进入 else if (node.child !== null) 分支
       * - 此时 node.child 是  span，它是 DOM 节点，所以将其添加到父 div
       * - 处理完 span 后，回溯并处理 p，也将其添加到父 div
       */
      node = node.child
      continue
    }

    if (node === workInProgress) {
      return
    }

    // 当没有兄弟节点了，回溯到父节点
    // 协助 else if (node.child !== null) 这个条件做回溯
    while(node.sibling === null) {
      // 当父节点没有或者是 workInProgress 时，说明已经遍历完了
      if (node.return === null || node.return === workInProgress) {
        return
      }

      node = node.return
    }

    node = node.sibling
  }
}