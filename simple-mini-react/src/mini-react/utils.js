import { REACT_TEXT } from "./constant"

export const isType = (type) => {
  return Object.prototype.toString.call(type).slice(8, -1)
}

// 将文本节点 转换为对象的形式，便于统一操作
export const toVNode = (node) => {
  return (isType(node) === 'String' || isType(node) === 'Number')
    ? {
      type: REACT_TEXT,
      props: { text: node }
    }: node
}
