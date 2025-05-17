import { setInitialProperties } from './ReactDomComponent'

export const shouldSetTextContent = (type, props) => {
  return typeof props.children === 'string' || typeof props.children === 'number'
}

/**
 * 创建真实 DOM 节点  
 * @param {*} type DOM 节点类型
 * @param {*} props 
 * @param {*} workInProgress 
 */
export const createInstance = (type, props, workInProgress) => {
  return document.createElement(type)
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
