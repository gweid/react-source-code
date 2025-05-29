/**
 * 设置节点的属性
 * @param {*} node 需要设置属性的 DOM 节点
 * @param {*} name 属性名
 * @param {*} value 属性值
 */
export const setValueForProperty = (node, name, value) => {
  if (value === null) {
    node.removeAttribute(name)
  } else {
    node.setAttribute(name, value)
  }
}
