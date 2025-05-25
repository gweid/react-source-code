import { setValueForStyles } from './CSSPropertyOperations'
import setTextContent from './setTextContent'
import { setValueForProperty } from './DOMPropertyOperations'

// 常量定义
const STYLE = 'style'
const CHILDREN = 'children'

/**
 * 初始化阶段：设置初始 DOM 属性
 * @param {*} domElement DOM 元素
 * @param {*} type DOM 元素的类型
 * @param {*} props 需要设置的属性
 */
export const setInitialProperties = (domElement, type, props) => {
  setInitialDOMProperties(type, domElement, props)
}

/**
 * 设置初始 DOM 属性
 * @param {*} tag DOM 元素的类型
 * @param {*} domElement 目标DOM 元素
 * @param {*} nextProps 需要设置的属性
 */
const setInitialDOMProperties = (tag, domElement, nextProps) => {
  for (const propKey in nextProps) {
    // 不能直接用，要判断这个属性是不是自己的属性，而不是原型链上的属性
    if (nextProps.hasOwnProperty(propKey)) {
      const nextProp = nextProps[propKey]
      if (propKey === STYLE) {
        setValueForStyles(domElement, nextProp)
      } else if (propKey === CHILDREN) {
        if (typeof nextProp === 'string' || typeof nextProp === 'number') {
          // `${nextProp}` 主要是转化成字符串统一处理，等价于 '' + nextProp
          setTextContent(domElement, `${nextProp}`)
        }
      } else if (nextProp !== null) {
        // 例如：img 标签的 src 等
        // 这里获取的不会有 key 和 ref 属性，因为这两个属性在创建虚拟 DOM 的时候，就没有放进 props 中
        setValueForProperty(domElement, propKey, nextProp)
      }
    }
  }
}

/**
 * 更新阶段：更新 DOM 属性
 * @param {*} domElement 真实 DOM 节点
 * @param {*} updatePayload 更新对象
 * @param {*} tag 标签类型
 * @param {*} lastRawProps 旧的 props
 * @param {*} nextRawProps 新的 props
 */
export const updateProperties = (
  domElement,
  updatePayload,
  tag,
  lastRawProps,
  nextRawProps
) => {
  updateDOMProperties(domElement, updatePayload)
}

/**
 * 更新阶段：更新 DOM 属性
 * @param {*} domElement 真实 DOM 节点
 * @param {*} updatePayload 更新对象
 */
const updateDOMProperties = (domElement, updatePayload) => {
  // 这里为什么 i += 2？
  // 因为 updatePayload 存储的格式是：[key, value, key, value, ...]
  for (let i = 0; i < updatePayload.length; i += 2) {
    const propKey = updatePayload[i]
    const propValue = updatePayload[i + 1]

    if (propKey === STYLE) {
      setValueForStyles(domElement, propValue)
    } else if (propKey === CHILDREN) {
      setTextContent(domElement, `${propValue}`)
    } else {
      setValueForProperty(domElement, propKey, propValue)
    }
  }
}

/**
 * 对比新旧 props（oldProps 和 newProps），找出需要 新增、更新或删除​​ 的 DOM 属性
 * 返回一个 ​​更新 payload 对象​​（称为 updatePayload），标记哪些属性需要修改，供 commitUpdate 阶段使用
 * 
 * 流程：
 *  1、遍历新旧 props​，处理属性移除、更新和添加
 *  2、特殊属性处理​，比如：style 属性、children 属性 等
 *  3、生成 updatePayload，标记哪些属性需要修改
 * @param {*} domElement 真实 DOM 节点
 * @param {*} tag 标签类型
 * @param {*} lastProps 旧的 props
 * @param {*} nextProps 新的 props
 * @returns ​更新对象（标记哪些属性需要修改）
 */
export const diffProperties = (domElement, tag, lastProps, nextProps) => {
  let updatePayload = null
  let propKey
  let styleName
  let styleUpdates = null

  // 遍历旧 props，查找在 nextProps 中不存在的属性，属性移除
  for (propKey in lastProps) {
    // hasOwnProperty 判断是否是自己的属性，而不是原型链上的属性
    // 如果在 nextProps 中存在，或者在 lastProps 中不存在，或者 lastProps 中该属性为 null
    // 则跳过，不需要进行移除
    if (
      nextProps.hasOwnProperty(propKey) ||
      !lastProps.hasOwnProperty(propKey) ||
      lastProps[propKey] === null
    ) {
      continue
    }

    // nextProps 中没有的属性，进行移除
    // 如果是 style 属性，需要特殊处理
    if (propKey === STYLE) {
      // 得到的 lastStyle 是一个样式对象： { color: 'red', fontSize: '12px' }
      const lastStyle = lastProps[propKey]

      for (styleName in lastStyle) {
        if (lastStyle.hasOwnProperty(styleName)) {
          if (!styleUpdates) {
            styleUpdates = {}
          }
          // 删除就是将属性置空
          styleUpdates[styleName] = ''
        }
      }
    } else {
      // [key, value, key, value, ...]
      // 这里的括号一定要是这样，如果 updatePayload 是 null 要先给 updatePayload 赋值（括号的作用），再 push
      // 而不是：updatePayload = (updatePayload || []).push(propKey, null)，这样是错误的
      (updatePayload = updatePayload || []).push(propKey, null)
    }
  }

  // 遍历新 props，处理属性更新和添加
  for (propKey in nextProps) {
    const nextProp = nextProps[propKey]
    const lastProp = lastProps !== null ? lastProps[propKey] : null

    // hasOwnProperty 判断是否是自己的属性，而不是原型链上的属性
    // nextProps 中没有该属性或者该属性值没有变化，则跳过
    if (
      !nextProps.hasOwnProperty(propKey) ||
      nextProp === lastProp ||
      (nextProp === null && lastProp === null)
    ) {
      continue
    }

    if (propKey === STYLE) {
      // 样式

      if (lastProp) {
        // 先置空样式
        for (styleName in lastProp) {
          // 如果 lastProp 中存在该样式，并且 nextProp 不存在或者 nextProp 中不存在该样式
          // 进行第二遍删除
          if (
            lastProp.hasOwnProperty(styleName) &&
            (!nextProp || !nextProp.hasOwnProperty(styleName))
          ) {
            if (!styleUpdates) {
              styleUpdates = {}
            }
            styleUpdates[styleName] = ''
          }
        }

        // 设置样式
        for (styleName in nextProp) {
          if (
            nextProp.hasOwnProperty(styleName) &&
            nextProp[styleName] !== lastProp[styleName]
          ) {
            if (!styleUpdates) {
              styleUpdates = {}
            }
            styleUpdates[styleName] = nextProp[styleName]
          }
        }
      } else {
        // 如果 lastProp 不存在，则直接设置
        styleUpdates = nextProp
      }
    } else if (propKey === CHILDREN) {
      // children 子节点

      /**
       * 这里为什么只处理文本节点？
       *  字符串/数字子节点​​会直接映射为 DOM 的 textContent，属于​​最简单的 DOM 属性更新​​，可以直接通过 updatePayload 标记变更
       *  非文本子节点​需要走完整的协调算法（Reconciliation）​​，通过 reconcileChildren 生成 Fiber 树并 Diff，无法通过简单的属性更新完成
       */
      if (typeof nextProp === 'string' || typeof nextProp === 'number') {
        (updatePayload = updatePayload || []).push(propKey, nextProp)
      }
    } else {
      (updatePayload = updatePayload || []).push(propKey, nextProp)
    }
  }

  // 将样式更新添加到 updatePayload 中
  if (styleUpdates) {
    (updatePayload = updatePayload || []).push(STYLE, styleUpdates)
  }

  // 存储的类似：['style', {color: 'red'}, 'children', '123']
  // 格式就是: [key, value, key, value, ...]
  return updatePayload
}
