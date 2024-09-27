import { isType } from './utils'
import { REACT_ELEMENT } from './constant'

/**
 * ReactDOM.render 函数
 * @param {*} VNode 虚拟 DOM
 * @param {*} containerDom 挂载的容器 DOM
 * 
 * 思路：
 *  1、将虚拟 DOM 转换为真实 DOM
 *  2、将真实 DOM 挂载到容器 DOM
 * 
 * 注意：
 *  1、普通标签
 *  2、函数组件
 *  3、类组件
 */
const render = (VNode, containerDom) => {
  // 实际上 render 上会做一些初始化处理，所以进行虚拟 DOM 转换及挂载真实 DOM 的操作放在 mount 函数
  mount(VNode, containerDom)
}

const mount = (VNode, containerDom) => {
  // 虚拟 DOM 转换为真实 DOM
  const realDOM = createDOM(VNode)
  // 挂载真实 DOM
  realDOM && containerDom.appendChild(realDOM)
}

/**
 * createDOM
 * @param {*} VNode 虚拟 DOM
 * 
 * 思路：
 *  1、根据 type 创建元素
 *  2、处理子元素
 *  3、处理属性值
 */
const createDOM = (VNode) => {
  const { $$typeof, type, props } = VNode

  // 如果是一个函数组件
  // VNode = {
  //   $$typeof: REACT_ELEMENT,
  //   "key": null,
  //   "ref": null,
  //   "props": {
  //       "children": []
  //   },
  //   type: () => {}
  // } 
  if(isType(type) === 'Function' && $$typeof === REACT_ELEMENT) {
    return getDOMByFuncCom(VNode)
  }

  // 普通元素标签
  // VNode = {
  //   $$typeof: REACT_ELEMENT,
  //   type: type,
  //   key,
  //   ref,
  //   props: {
  //     // children: ''
  //     // children: {}
  //     children: []
  //   }
  // }
  // 1、创建元素
  let dom
  if (type && $$typeof === REACT_ELEMENT) {
    dom = document.createElement(type)
  }

  // 2、处理子元素
  if (props) {
    const { children } = props

    // if (isType(children) === 'String') {
    //   // 子节点是文本节点
    //   const textNode = document.createTextNode(children)
    //   dom.appendChild(textNode)
    // } else if (isType(children) === 'Object' && children.type) {
    //   // 子节点是对象
    //   mount(children, dom)
    // } else if (isType(children) === 'Array') {
    //   // 子节点是数组
    //   mountArray(children, dom)
    // }
    createDOMTool(children, dom)
  }

  // 3、处理属性值
  setPropsForDOM(props, dom)

  return dom
}

// 处理函数组件
const getDOMByFuncCom = (VNode) => {
  const { type, props } = VNode
  // 执行函数，拿到函数组件的虚拟 DOM 
  const renderVNode = type && type(props)

  if (!renderVNode) return null

  // 重新走 createDOM 创建元素
  const dom =  createDOM(renderVNode)
  return dom
}

const mountArray = (VNode, parent) => {
  VNode.forEach(child => {
    // if (isType(child) === 'String') {
    //   // 子节点是文本节点
    //   const textNode = document.createTextNode(child)
    //   parent.appendChild(textNode)
    // } else if (isType(child) === 'Object' && child.type) {
    //   // 子节点是对象
    //   mount(child, parent)
    // } else if (isType(child) === 'Array') {
    //   // 子节点是数组
    //   mountArray(child, parent)
    // }
    createDOMTool(child, parent)
  })
}

const createDOMTool = (VNode, eleDom) => {
  if (isType(VNode) === 'String') {
    // 子节点是文本节点
    const textNode = document.createTextNode(VNode)
    eleDom.appendChild(textNode)
  } else if (isType(VNode) === 'Object' && VNode.type) {
    // 子节点是对象
    mount(VNode, eleDom)
  } else if (isType(VNode) === 'Array') {
    // 子节点是数组
    mountArray(VNode, eleDom)
  }
}

// 设置属性
const setPropsForDOM = (props = {}, dom) => {
  if (!dom) return

  // props: {
  //   children: [],
  //   style: {}, 
  //   onClick: () => {}
  // }
  for (let key in props) {
    // 如果是 children，已经处理过，跳过
    if (key === 'children') continue

    if (/^on[A-Z].*/.test(key)) {
      // 如果是事件

    } else if (key === 'style') {
      // 如果是样式 style
      // style = { color: 'red' }
      // <div style="color: red"></div>
      const styleObj = props[key] 
      Object.keys(styleObj).forEach(styleName => {
        dom.style[styleName] = styleObj[styleName]
      })
    } else {
      dom[key] = props[key]
    }
  }
}


const ReactDOM = {
  render
}

export default ReactDOM
 