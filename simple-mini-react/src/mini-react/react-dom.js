import { isType } from './utils'
import {addEvent} from './events'
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
 * 处理：
 *  1、类组件
 *  2、函数组件
 *  3、普通标签
 * 
 * 思路：
 *  1、根据 type 创建元素
 *  2、处理子元素
 *  3、处理属性值
 */
const createDOM = (VNode) => {
  const { $$typeof, type, props } = VNode
 
  // 如果是类组件：根据 type.IS_CLASS_COMPONENT 区分类组件，IS_CLASS_COMPONENT 定义在 Component 中
  if(isType(type) === 'Function' && $$typeof === REACT_ELEMENT && type.IS_CLASS_COMPONENT) {
    return getDOMByClassCom(VNode)
  }

  // 如果是一个函数组件
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

  // 将 DOM 保存到 VNode 上，在更新操作的时候，用 于比较
  VNode.dom = dom
 
  return dom
}

// 处理函数组件
const getDOMByFuncCom = (VNode) => {
  // VNode = {
  //   $$typeof: REACT_ELEMENT,
  //   key: null,
  //   ref: null,
  //   props: {
  //       children: []
  //   },
  //   type: () => {}
  // }

  const { type, props } = VNode
  // 执行函数，拿到函数组件的虚拟 DOM 
  const renderVNode = type && type(props)

  if (!renderVNode) return null

  // 重新走 createDOM 创建元素
  const dom =  createDOM(renderVNode)
  return dom 
}

// 处理类组件
const  getDOMByClassCom = (VNode) => {
  // VNode = {
  //   key: null,
  //   ref: null,
  //   props: {
  //       name: "my-func-com",
  //       children: []
  //   },
  //   type: class MyClassCom
  // }

  const { type, props } = VNode

  // 类组件，需要 new 创建示例，然后执行 render 函数得到虚拟 DOM 
  const classComInstance = type && new type(props)
  const renderVNode = classComInstance.render && classComInstance.render()

  // 将这个 renderVNode 挂载到类组件实例，为了后面更新时，与新的 VNode 进行比较 
  classComInstance.oldVNode = renderVNode

  // 调试代码：3 秒后调用 setState 改变值，触发更新
  // setTimeout(() => {
  //   classComInstance.setState({
  //     age: 999
  //   })
  // }, 3000)

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
  if (isType(VNode) === 'Object' && VNode.type) {
    // 子节点是对象
    mount(VNode, eleDom)
  } else if (isType(VNode) === 'Array') {
    // 子节点是数组
    mountArray(VNode, eleDom)
  } else {
    // 子节点是文本节点。TODO：默认了其它都是文本节点，实际上要处理 null、undefined 等情况
    const textNode = document.createTextNode(VNode)
    eleDom.appendChild(textNode)
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
      addEvent(dom, key.toLocaleLowerCase(), props[key])
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

export const findDOMByVNode = (VNode) => {
  if (!VNode) return
  if (VNode.dom) return VNode.dom
}

export const updateDomTree = (oldDOM, newVNode) => {
  const parentNode = oldDOM.parentNode

  // 先删除旧 DOM。TODO: diff 过程先省略
  parentNode.removeChild(oldDOM)

  const newDOM = createDOM(newVNode)
  parentNode.appendChild(newDOM)
}


const ReactDOM = {
  render
}

export default ReactDOM
 