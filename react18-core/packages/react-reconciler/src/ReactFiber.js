import { HostRoot, HostComponent, HostText, IndeterminateComponent } from './ReactWorkTags'
import { NoFlags } from './ReactFiberFlags'

/**
 * Fiber 节点构造函数
 * @param {*} tag Fiber 类型，如：函数组件、类组件、原生组件、根元素等
 * @param {*} pendingProps 新属性，等待处理或者说生效的属性
 * @param {*} key 唯一标识
 */
export function FiberNode(tag, pendingProps, key) {
  this.tag = tag                     // 标记 Fiber 节点的类型，用于快速区分节点类型的标识（HostRoot(3)：根节点； HostComponent(5)：原生 DOM 元素；FunctionComponent(0)：函数组件；ClassComponent(1)：类组件；Fragment(7)：Fragment标签）
  this.key = key                     // 唯一标识（用于 Diff 算法）
  this.type = null                   // 元素的具体类型，用于创建节点或组件的类型信息（原生 DOM 元素：type 是字符串，如 div；函数组件：type 是函数本身；类组件：type 是类本身；根节点：type 为 null）
  this.stateNode = null              // 关联真实 DOM 或组件实例
  this.child = null                  // 第一个子节点
  this.sibling = null                // 下一个兄弟节点
  this.return = null                 // 父节点
  this.pendingProps = pendingProps   // 待生效的 props
  this.memoizedProps = null          // 当前生效的 props
  this.memoizedState = null          // 当前生效的状态
  this.updateQueue = null            // 更新队列
  this.flags = NoFlags               // 节点标记，比如是更新还是删除
  this.subtreeFlags = NoFlags        // 所有子节点的标记，比如是更新还是删除（优化作用，层层通知）
  this.alternate = null              // 指向当前 Fiber 节点的替代 Fiber 节点，双缓存的关键
  this.index = 0                     // 表示同级节点中节点的位置索引
}

/**
 * 创建 Fiber 节点
 * @param {*} tag Fiber 类型
 * @param {*} pendingProps 新属性
 * @param {*} key 唯一标识
 * @returns Fiber 节点
 */
export const createFiber = (tag, pendingProps, key) => {
  return new FiberNode(tag, pendingProps, key)
}

/**
 * 创建 RootFiber
 * @returns RootFiber 节点（HostRoot 类型）
 */
export const createHostRootFiber = () => {
  return createFiber(HostRoot, null, null)
}

/**
 * 基于当前屏幕 UI 对应的 Fiber 树和新的属性创建一个新的正在工作的 Fiber 树（双缓存）
 * @param {*} current 当前屏幕 UI 对应的 Fiber 树
 * @param {*} pendingProps 新的属性
 * @returns 新的正在工作的 Fiber 树
 */
export const createWorkInProgress = (current, pendingProps) => {
  let workInProgress = current.alternate

  if (workInProgress === null) {
    // workInProgress 为 null，代表初始化阶段
    workInProgress = createFiber(current.tag, pendingProps, current.key)

    workInProgress.stateNode = current.stateNode
    workInProgress.alternate = current
    current.alternate = workInProgress
  } else {
    // 更新阶段
    workInProgress.pendingProps = pendingProps
    workInProgress.flags = NoFlags
    workInProgress.subtreeFlags = NoFlags
  }

  workInProgress.type = current.type
  workInProgress.child = current.child
  workInProgress.sibling = current.sibling
  workInProgress.memoizedProps = current.memoizedProps
  workInProgress.memoizedState = current.memoizedState
  workInProgress.updateQueue = current.updateQueue
  workInProgress.index = current.index

  return workInProgress
}

/**
 * 根据虚拟 DOM 创建 Fiber 节点
 * @param {*} element 虚拟 DOM
 * @returns Fiber 节点
 */
export const createFiberFromElement = (element) => {
  const { type, key, props: pendingProps } = element

  return createFiberFromTypeAndProps(type, key, pendingProps)
}

/**
 * 根据类型和属性创建 Fiber 节点
 * @param {*} type 类型
 * @param {*} key 唯一标识
 * @param {*} pendingProps 新属性
 * @returns Fiber 节点
 */
const createFiberFromTypeAndProps = (type, key, pendingProps) => {
  // 一开始，不知道 tag 是什么类型
  let tag = IndeterminateComponent

  // 原生标签
  if (typeof type === 'string') {
    tag = HostComponent
  }

  const fiber = createFiber(tag, pendingProps, key)
  fiber.type = type

  return fiber
}

/**
 * 创建一个文本类型的 Fiber 节点
 * @param {*} content 文本内容
 * @returns 文本类型的 Fiber 节点
 */
export const createFiberFromText = (content) => {
  return createFiber(HostText, content, null);
}
