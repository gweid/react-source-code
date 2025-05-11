// 自定义 React.createElement 函数
import { Component, PureComponent } from './Component'
import { toVNode, shallowCompare } from './utils'
import { REACT_ELEMENT, REACT_FORWARD_REF, REACT_MEMO } from './constant'

// 导出所有 hooks
export * from './hooks'

// <div>react<span>react demo</span></div> 这个会被 babel 转化成：
// React.createElement("div", null, "react", React.createElement("span", null, "react demo"));
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

  // 先删除不是 react 本身的无用属性，这两个属性是 babel 编译 jsx 带上的
  const filterKey = ['_owner', '_store', '__self', '__source']
  filterKey.forEach(key => {
    delete properties[key]
  })

  const { key = null, ref = null, ...props } = properties

  // toVNode 作用: 将文本节点 转换为对象的形式，便于统一操作
  // 箭头函数没有 arguments，所以使用剩余参数代替
  if (args.length === 1) {
    props.children = toVNode(args[0])
  } else {
    props.children = args.map(toVNode)
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

/**
 * 实现 forwardRef
 * @param {*} render 
 * @returns 
 * 
 * const FuncCom = {
 *  $$typeof: REACT_FORWARD_REF,
 *  render 
 * }
 * ReactDOM.render(<FuncCom />, root);
 * 
 * 这个在 babel 中会被转译为：
 * ReactDOM.render(React.createElement(FuncCom, null), root)
 * 也就是说，最终会调用 React.createElement 转换为虚拟 DOM
 */
const forwardRef = (render) => {
  return {
    $$typeof: REACT_FORWARD_REF,
    render 
  }
}

const memo = (type, compare = shallowCompare) => {
  // {
  //   $$typeof: Symbol('react.memo'),
  //   compare: null,
  //   type: (props) => {}
  // }
  return {
    $$typeof: REACT_MEMO,
    type,
    compare
  }
}

const React = {
  createElement,
  Component,
  PureComponent,
  memo,
  createRef,
  forwardRef
}

export default React