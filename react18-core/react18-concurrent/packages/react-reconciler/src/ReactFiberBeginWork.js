import {
  HostRoot,
  HostComponent,
  HostText,
  IndeterminateComponent,
  FunctionComponent
} from './ReactWorkTags'
import { processUpdateQueue } from './ReactFiberClassUpdateQueue'
import { mountChildFibers, reconcileChildFibers } from './ReactChildFiber'
import { shouldSetTextContent } from 'react-dom-bindings/src/client/ReactDOMHostConfig'
import { renderWithHooks } from './ReactFiberHooks'

/**
 * 将虚拟 DOM 转换为 Fiber 节点
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树
 * @returns Fiber 子节点 | null
 */
export const beginWork = (current, workInProgress, renderLanes) => {
  switch (workInProgress.tag) {
    case IndeterminateComponent:
      // 首次渲染，workInProgress.tag 不确定时走这个函数处理
      return mountIndeterminateComponent(current, workInProgress, workInProgress.type)
    case FunctionComponent:
      // 更新阶段，已经确认时函数组件，直接走这里处理函数组件
      const Component = workInProgress.type
      const nextProps = workInProgress.pendingProps
      return updateFunctionComponent(current, workInProgress, Component, nextProps)
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes)
    case HostComponent:
      return updateHostComponent(current, workInProgress)
    case HostText:
      // 为什么文本节点返回 null，因为 Fiber 对文本节点做了优化，不生成文本节点的 Fiber 树
      // 那么文本树的 Fiber 生成，是
      return null
    default:
      return null
  }
}

/**
 * workInProgress.tag 不确定时的处理
 * 这是首次渲染，workInProgress.tag 不确定时对函数组件的处理
 * 这里如果确定是函数组件，会： workInProgress.tag = FunctionComponent
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树
 * @param {*} Component 函数组件的函数 () => {}
 * @returns 第一个子 Fiber 节点
 */
const mountIndeterminateComponent = (current, workInProgress, Component) => {
  const props = workInProgress.pendingProps

  const value = renderWithHooks(current, workInProgress, Component, props)

  // 标记为函数类型 tag
  workInProgress.tag = FunctionComponent

  // 协调子节点，生成子 Fiber 树
  reconcileChildren(current, workInProgress, value)

  // 返回第一个子 Fiber 节点
  return workInProgress.child
}

/**
 * 更新函数组件的 Fiber 节点
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树
 * @param {*} Component 函数组件的函数 () => {}
 * @param {*} nextProps 新的 props
 * @returns 第一个子 Fiber 节点
 */
const updateFunctionComponent = (current, workInProgress, Component, nextProps) => {
  const nextChildren = renderWithHooks(current, workInProgress, Component, nextProps)

  // 协调子节点，生成子 Fiber 树
  reconcileChildren(current, workInProgress, nextChildren)

  // 返回第一个子 Fiber 节点
  return workInProgress.child
}

/**
 * 更新根 HostRoot 类型的 Fiber 节点（RootFiber）
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树
 * @returns 第一个子 Fiber 节点
 */
const updateHostRoot = (current, workInProgress, renderLanes) => {
  const nextProps = workInProgress.pendingProps
  // 根据旧状态和更新队列中的更新计算最新的状态
  processUpdateQueue(workInProgress, nextProps, renderLanes)

  // 获取新状态
  // 经过 processUpdateQueue 处理完之后，workInProgress.memoizedState 就是新的状态
  const nextState = workInProgress.memoizedState

  // 这个就是更新对象中 playload 的 element，也就是 虚拟 DOM
  // 要渲染的新的 【子虚拟 DOM】
  const nextChildren = nextState.element

  // 协调子元素：React 的核心协调算法，负责比较当前 Fiber 树和新的虚拟 DOM 树，计算出需要进行的最小更新操作
  reconcileChildren(current, workInProgress, nextChildren)

  // 返回第一个子 Fiber 节点
  return workInProgress.child
}

/**
 * 更新原生节点的 Fiber 节点并构建子 Fiber 链表
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树
 * @returns 第一个子 Fiber 节点
 */
const updateHostComponent = (current, workInProgress) => {
  const { type } = workInProgress
  const nextProps = workInProgress.pendingProps

  // 根据虚拟 DOM 创建 Fiber 节点，会将 虚拟 DOM 的 props 赋值给 Fiber 的 pendingProps
  // 所以这里拿到的 children，就是子虚拟 DOM
  let nextChildren = nextProps.children

  // 判断 nextChildren 是不是文本节点
  const isDirectTextChild = shouldSetTextContent(type, nextProps)
  // 检查是否是纯文本子节点，如果是，标记为无需协调子节点
  // 文本节点优化：如果是纯文本子节点，直接通过 DOM 的 textContent 设置文本，​​避免创建额外的文本 Fiber 节点​​
  if (isDirectTextChild) {
    nextChildren = null
  }

  // 协调子节点，生成子 Fiber 树
  reconcileChildren(current, workInProgress, nextChildren)
  
  // 返回第一个子 Fiber 节点
  return workInProgress.child
}

/**
 * 根据新的虚拟 DOM 生成新的 Fiber 链表
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树
 * @param {*} nextChildren 新的 子虚拟DOM
 */
const reconcileChildren = (current, workInProgress, nextChildren) => {
  if (current === null) {
    workInProgress.child = mountChildFibers(workInProgress, null, nextChildren)
  } else {
    workInProgress.child = reconcileChildFibers(workInProgress, current.child, nextChildren)
  }
}
