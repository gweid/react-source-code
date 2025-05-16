import { setValueForStyles } from './CSSPropertyOperations'
import setTextContent from './setTextContent'
import { setValueForProperty } from './DOMPropertyOperations'
/**
 * 创建一个新的 Fiber 节点
 * @param {*} current 旧的 Fiber 节点
 * @param {*} pendingProps 新的属性

/**
 * 设置初始DOM属性
 * @param {*} tag DOM 元素的类型
 * @param {*} domElement 目标DOM 元素
 * @param {*} nextProps 需要设置的属性
 */
const setInitialDOMProperties = (tag, domElement, nextProps) => {
  for (const propKey in nextProps) {
    // 不能直接用，要判断这个属性是不是自己的属性，而不是原型链上的属性
    if (nextProps.hasOwnProperty(propKey)) {
      const nextProp = nextProps[propKey]
      if (propKey === 'style') {
        setValueForStyles(domElement, nextProp)
      } else if (propKey === 'children') {
        if (typeof nextProp === 'string' || typeof nextProp === 'number') {
          // `${nextProp}` 主要是转化成字符串统一处理，等价于 '' + nextProp
          setTextContent(domElement, `${nextProp}`)
        }
      } else if (nextProp !== null) {
        // 这里获取的不会有 key 和 ref 属性，因为这两个属性在创建虚拟 DOM 的时候，就没有放进 props 中
        setValueForProperty(domElement, propKey, nextProp)
      }
    }
  }
}

/**
 * 设置初始 DOM 属性
 * @param {*} domElement DOM 元素
 * @param {*} type DOM 元素的类型
 * @param {*} props 需要设置的属性
 */
export const setInitialProperties = (domElement, type, props) => {
  setInitialDOMProperties(type, domElement, props)
}
