// 自定义 React.createElement 函数
import { Component } from './Component'
import { REACT_ELEMENT, REACT_FORWARD_REF } from './constant'

// React.createElement("div", null, "react demo");
const createElement = (type, properties, ...args) => {
  // 通过在 jsx 文件中 console.log(<div>react demo</div>) 得到的虚拟 DOM 如下：
  // { 
  //   "$$typeof": Symbol(react.element),
  //   "type": "div",
  //   "key": null,
  //   "ref": null,
  //   "props": { 
  //       "children": "react demo"
  //   },
  //   "_owner": null, // 这个与 react 无关的，是 babel 转化带来的
  //   "_store": {} // 这个与 react 无关的，是 babel 转化带来的
  // }

  // 先删除不是 react 本身的无用属性
  const filterKey = ['_owner', '_store']
  filterKey.forEach(key => {
    delete properties[key]
  })

  const { key = null, ref = null, ...props } = properties

  if (args.length === 1) {
    props.children = args[0]
  } else {
    props.children = args
  }

  return {
    $$typeof: REACT_ELEMENT,
    type,
    key,
    ref,
    props
  }
}

// 创建 ref
const createRef = (currentValue = null) => {
  return {
    current: currentValue
  }
}

// 实现 forwardRef
const forwardRef = (render) => {
  return {
    $$typeof: REACT_FORWARD_REF,
    render
  }
}

const React = {
  createElement,
  Component,
  createRef,
  forwardRef
}

export default React