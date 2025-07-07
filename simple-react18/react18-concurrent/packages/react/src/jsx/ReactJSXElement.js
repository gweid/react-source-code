import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import hasOwnProperty from 'shared/hasOwnProperty'

// 需要过滤掉的属性，key 和 ref 已经处理，__self 和 __source 是 babel 编译时带过来的
const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
}

// 判断 config 对象是否有的 key 属性
const hasValidKey = (config) => {
  return config.key !== undefined
}

// 判断 config 对象是否有的 ref 属性
const hasValidRef = (config) => {
  return config.ref!== undefined
}

// 创建一个React元素（虚拟DOM），抽离出来，在其它地方也可以使用
const ReactElement = (type, key, ref, props)  => {
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props
  }
}

// 创建一个 React 元素的函数，处理 key 和 ref 属性，并将其他属性添加到props对象中
export const jsxDEV = (type, config, maybeKey) => {
  const props = {}
  let key = null
  let ref = null

  // 如果 maybeKey 存在，则赋值给 key
  if (maybeKey !== undefined) {
    key = '' + maybeKey
  }

  if (hasValidKey(config)) {
    key = '' + config.key
  }

  if (hasValidRef(config)) {
    ref = config.ref
  }

  let propName
  for (propName in config) {
    if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
      props[propName] = config[propName]
    }
  }

  return ReactElement(type, key, ref, props)
}
