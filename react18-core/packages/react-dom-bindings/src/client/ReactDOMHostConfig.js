import { setInitialProperties, diffProperties, updateProperties } from './ReactDOMComponent'
import { precacheFiberNode, updateFiberProps } from './ReactDOMComponentTree'

export const shouldSetTextContent = (type, props) => {
  return typeof props.children === 'string' || typeof props.children === 'number'
}

/**
 * 创建真实 DOM 节点  
 * @param {*} type DOM 节点类型
 * @param {*} props props 属性
 * @param {*} internalInstanceHandle 就是 workInProgress 
 */
export const createInstance = (type, props, internalInstanceHandle) => {
  const domElement = document.createElement(type)

  // 在真实 DOM 节点添加 Fiber
  precacheFiberNode(internalInstanceHandle, domElement)

  // 在真实 DOM 节点添加 props
  updateFiberProps(domElement, props)

  return domElement
}

/**
 * 创建文本节点
 * @param {*} content 文本内容
 * @returns 文本节点
 */
export const createTextInstance = (content) => {
  return document.createTextNode(content)
}

/**
 * 将子节点插入到父节点中
 * @param {*} parent 父 DOM 节点
 * @param {*} child 子 DOM 节点
 */
export const appendInitialChild = (parent, child) => {
  parent.appendChild(child)
}

/**
 * 为 DOM 节点设置初始属性
 * @param {*} domElement DOM 节点
 * @param {*} type DOM 节点的类型
 * @param {*} props 需要设置的属性
 */
export const finalizeInitialChildren = (domElement, type, props) => {
  setInitialProperties(domElement, type, props)
}

/**
 * 将子节点添加到父节点
 * @param {*} parentInstance 父节点
 * @param {*} child 子节点
 */
export const appendChild = (parentInstance, child) => {
  parentInstance.appendChild(child)
}

/**
 * 在指定子节点前插入新的子节点
 * @param {*} parentInstance 父节点
 * @param {*} child 需要插入的新子节点
 * @param {*} beforeChild 指定的子节点
 */
export const insertBefore = (parentInstance, child, beforeChild) => {
  parentInstance.insertBefore(child, beforeChild);
}

/**
 * 调用 diffProperties 生成更新描述 updatePayload 并返回
 * @param {*} domElement 真实 DOM 节点
 * @param {*} type 标签类型
 * @param {*} oldProps 旧的 props
 * @param {*} newProps 新的 props
 * @returns 
 */
export const prepareUpdate = (domElement, type, oldProps, newProps) => {
  // 对比新旧 props（oldProps 和 newProps），找出需要 ​​新增、更新或删除​​ 的 DOM 属性
  // 返回一个 ​​更新 payload 对象​​（称为 updatePayload），标记哪些属性需要修改，供 commitUpdate 阶段使用
  return diffProperties(domElement, type, oldProps, newProps)
}

/**
 * 更新阶段：更新属性 和 将 props 挂载在真实 DOM 上
 * @param {*} domElement 真实 DOM 节点
 * @param {*} updatePayload 更新对象
 * @param {*} type 标签类型
 * @param {*} oldProps 旧的 props
 * @param {*} newProps 新的 props
 * @param {*} finishedWork 最新的可展示的 Fiber 树
 */
export const commitUpdate = (
  domElement,
  updatePayload,
  type,
  oldProps,
  newProps,
  finishedWork
) => {
  // 更新属性
  updateProperties(domElement, updatePayload, type, oldProps, newProps)

  // 将 props 挂载在真实 DOM 上，便于后面比如 事件监听 中使用
  updateFiberProps(domElement, newProps)
}
