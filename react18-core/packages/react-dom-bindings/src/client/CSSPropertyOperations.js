/**
 * 设置节点的样式
 * @param {*} node 需要设置样式的目标节点
 * @param {*} styles 样式对象
 */
export const setValueForStyles = (node, styles) => {
  for (const styleName in styles) {
    // 要判断这个属性是不是自己的属性，而不是原型链上的属性
    if (styles.hasOwnProperty(styleName)) {}
    const styleValue = styles[styleName]
    node.style[styleName] = styleValue
  }
}
