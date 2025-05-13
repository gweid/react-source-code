import { HostRoot } from './ReactWorkTags'
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
  this.subtreeFlags = NoFlags        // 子节点的标记，比如是更新还是删除（优化作用，层层通知）
  this.altername = null              // 指向当前 Fiber 节点的替代 Fiber 节点，双缓存的关键
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
