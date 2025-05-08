import { REACT_TEXT } from "./constant"

export const isTypeOf = (key, type)  => {
  return Object.prototype.toString.call(key).slice(8, -1) === type
}

// 将文本节点转换为对象的形式（即虚拟 DOM 对象），便于统一操作
export const toVNode = (node) => {
  return (isTypeOf(node, 'String') || isTypeOf(node, 'Number'))
    ? {
      type: REACT_TEXT,
      props: { text: node }
    }: node
}

export const deepClone = (data) => {
  // 处理基本类型和 null
  if (data === null || typeof data !== 'object') {
    return data
  }

  // 处理日期对象
  if (data instanceof Date) {
    return new Date(data.getTime())
  }

  // 处理正则对象
  if (data instanceof RegExp) {
    return new RegExp(data)
  }

  // 使用 WeakMap 解决循环引用问题
  const hashMap = new WeakMap()

  function clone(value) {
    if (value === null || typeof value !== 'object') {
      return value
    }

    // 检查是否存在循环引用
    if (hashMap.has(value)) {
      return hashMap.get(value)
    }

    // 处理日期对象
    if (value instanceof Date) {
      return new Date(value.getTime())
    }

    // 处理正则对象
    if (value instanceof RegExp) {
      return new RegExp(value)
    }

    const newObj = Array.isArray(value) ? [] : {}
    
    // 将当前对象加入 WeakMap，解决循环引用
    hashMap.set(value, newObj)

    // 递归处理所有属性
    for (let key in value) {
      if (value.hasOwnProperty(key)) {
        newObj[key] = clone(value[key])
      }
    }

    return newObj
  }

  return clone(data)
}