import { isTypeOf } from './utils'
import { addEvent } from './events'
import {
  REACT_ELEMENT,
  REACT_FORWARD_REF,
  REACT_TEXT,
  REACT_MEMO,
  REACT_DIFF_CREATE,
  REACT_DIFF_MOVE
} from './constant'

/**
 * ReactDOM.render 函数
 * @param {*} VNode 虚拟 DOM
 * @param {*} containerDOM 挂载的容器 DOM
 * 
 * 主要做初始化渲染
 * 真正将虚拟 DOM 转换为真实 DOM 并挂载到页面上是 mount 函数
 */
const render = (VNode, containerDOM) => {
  // 实际上 render 上会做一些初始化处理，所以进行虚拟 DOM 转换及挂载真实 DOM 的操作放在 mount 函数
  // 初始化渲染的操作（省略...）
  mount(VNode, containerDOM)
}

/**
 * mount: 挂载
 * @param {*} VNode 虚拟 DOM 
 * @param {*} containerDOM 挂载的容器 DOM 
 * 
 *  * 流程：
 *  1、将虚拟 DOM 转换为真实 DOM
 *  2、将真实 DOM 挂载到容器 DOM
 * 
 * 注意：
 *  1、普通标签
 *  2、函数组件
 *  3、类组件
 */
const mount = (VNode, containerDOM) => {
  // 虚拟 DOM 转换为真实 DOM
  const realDOM = createDOM(VNode)
  // 挂载真实 DOM
  realDOM && containerDOM.appendChild(realDOM)
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
 * 流程：
 *  1、根据 type 创建元素
 *  2、处理子元素
 *  3、处理属性值
 */
const createDOM = (VNode) => {
  const { $$typeof, type, props, ref } = VNode

  // 如果是 memo 包裹的组件
  if(type && type.$$typeof === REACT_MEMO) {
    return getDOMByMemo(VNode)
  }

  // 如果是 forwardRef 包裹的函数组件
  // 注意这里是 type 中的 $$typeof，与 VNode 中的 $$typeof 是不一样的
  if(type && type.$$typeof === REACT_FORWARD_REF) {
    return getDOMByForwardRef(VNode)
  }

  // 如果是类组件：根据 type.IS_CLASS_COMPONENT 区分类组件，IS_CLASS_COMPONENT 定义在 Component 中
  if(isTypeOf(type, 'Function') &&  $$typeof === REACT_ELEMENT && type.IS_CLASS_COMPONENT) {
    return getDOMByClassCom(VNode)
  }

  // 如果是一个函数组件
  if(isTypeOf(type, 'Function') && $$typeof === REACT_ELEMENT) {
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
  if (type === REACT_TEXT) {
    // 如果是文本节点
    dom = document.createTextNode(props.text)
  } else if (type && $$typeof === REACT_ELEMENT) {
    dom = document.createElement(type)
  }

  // 2、处理子元素
  if (props) {
    const { children } = props

    if (isTypeOf(children, 'Object') && children.type) {
      // 子节点是对象
      mount(children, dom)
    } else if (isTypeOf(children, 'Array')) {
      // 子节点是数组
      mountArray(children, dom)
    }
  } 

  // 3、处理属性值
  setPropsForDOM(props, dom)

  // 处理 ref，将当前 dom 传递给 ref.current
  ref && (ref.current = dom)

  // 将 DOM 保存到 VNode 上，在更新操作的时候，用于比较
  VNode.dom = dom

  return dom
}

const mountArray = (VNode, parent) => {
  if (!isTypeOf(VNode, 'Array')) return;
  VNode.forEach((child, index) => {
    // 这个在 updateChildren 中进行 diff 的时候会用到
    child && (child.index = index)
    mount(child, parent)
  })
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

// 处理 memo 包裹的组件
const getDOMByMemo = (VNode) => {
  const { type, props } = VNode

  const renderVNode = type.type && type.type(props)

  if (!renderVNode) return null

  VNode.oldRenderVNode = renderVNode

  const dom = createDOM(renderVNode)
  return dom
}

// 处理 forwardRef 包裹的函数组件
const getDOMByForwardRef = (VNode) => {
  const { type, props, ref } = VNode

  // forwordRef(FuncComp)
  // const FuncComp = (props, ref) => (<div>函数组件</div>)
  // 包裹在 forwordRef 的函数组件，多一个 ref 属性
  const renderVNode = type.render && type.render(props, ref)
 
  if (!renderVNode) return null

  VNode.oldRenderVNode = renderVNode

  const dom = createDOM(renderVNode)
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
  //   type: function MyFuncCom() {}
  // }

  const { type, props } = VNode
  // 执行函数，拿到函数组件的虚拟 DOM
  const renderVNode = type && type(props)

  if (!renderVNode) return null

  // 往 VNode 上挂载 renderVNode，用于后面 diff 的时候使用
  VNode.oldRenderVNode = renderVNode

  // 重新走 createDOM 创建元素
  const dom = createDOM(renderVNode)

  // 将 DOM 保存到 VNode 上，在更新操作的时候，用于比较
  VNode.dom = dom

  return dom
}

// 处理类组件
const getDOMByClassCom = (VNode) => {
  // VNode = {
  //   key: null,
  //   ref: null,
  //   props: {
  //       name: "my-func-com",
  //       children: []
  //   },
  //   type: class MyClassCom
  // }

  const { type, props, ref } = VNode

  // 类组件，需要 new 创建示例，然后执行 render 函数得到虚拟 DOM 
  const classComInstance = type && new type(props)
  const renderVNode = classComInstance.render && classComInstance.render()

  // 将 classComInstance 挂载到 VNode，是为了后面 diff 时使用
  VNode.classComInstance = classComInstance;

  // 处理 ref，注意这里，类组件的 ref current 是当前类实例
  ref && (ref.current = classComInstance)

  // 将 renderVNode 挂载到类组件实例，为了后面更新时，与新的 VNode 进行比较 
  classComInstance.oldVNode = renderVNode

  // 调试代码：3 秒后调用 setState 改变值，触发更新
  // setTimeout(() => {
  //   classComInstance.setState({
  //     age: 999
  //   })
  // }, 3000)
 
  if (!renderVNode) return null

  // 重新走 createDOM 创建元素
  const dom = createDOM(renderVNode)

  // componentDidMount 生命周期钩子
  classComInstance.componentDidMount && classComInstance.componentDidMount()

  return dom
}

export const findDOMByVNode = (VNode) => {
  if (!VNode) return
  if (VNode.dom) return VNode.dom
}

export const updateDomTree = (oldVNode, newVNode, oldDOM) => {
  const parentNode = oldDOM.parentNode

  // 没有 diff 的版本：直接移除旧 DOM，创建新 DOM 后更新
  // parentNode.removeChild(oldDOM)
  // const newDOM = createDOM(newVNode)
  // parentNode.appendChild(newDOM)

  // ----------------------- diff 比对 -----------------------
  // 注意：react 的 dom diff 是从根节点开始的
  // 1、新、旧节点都不存在
  // 2、新节点存在，旧节点不存在
  // 3、旧节点存在，新节点不存在
  // 4、新、旧节点都存在，但是类型不一样
  // 5、新、旧节点都存在，类型也一样，这种情况才需要进行 diff 比对
  const typeMap = {
    NO_OPREATE: !oldVNode && !newVNode,
    ADD: !oldVNode && newVNode,
    DELETE: oldVNode && !newVNode,
    REPLACE: oldVNode && newVNode && oldVNode.type !== newVNode.type
  }

  // 使用 filter 过滤了，只有结果为 true 的才会被过滤出来。这里是取到第一个为 true 的 key
  const UPDATE_TYPE = Object.keys(typeMap).filter(key => typeMap[key])[0]

  switch(UPDATE_TYPE) {
    case 'NO_OPREATE':
      // 新、旧节点都不存在，不做操作
      break
    case 'ADD':
      // 新节点存在，旧节点不存在，新增新节点
      addVNode(newVNode, parentNode)
      break
    case 'DELETE':
      // 旧节点存在，新节点不存在，直接移除旧节点
      removeVNode(oldVNode, parentNode)
      break
    case 'REPLACE':
      // 新、旧节点都存在，但是类型不一样，先移除旧节点，再创建新节点
      removeVNode(oldVNode, parentNode)
      addVNode(newVNode, parentNode)
      break
    default:
      // 新、旧节点都存在，类型也一样，进行 diff 比对
      deepDomDiff(oldVNode, newVNode)
      break
  }
}

const addVNode = (newVNode, parentNode) => {
  const newDOM = createDOM(newVNode)
  parentNode.appendChild(newDOM)
}

const removeVNode = (oldVNode, parentNode) => {
  const oldDOM = findDOMByVNode(oldVNode)
  // 使用父节点 removeChild 兼容性比直接自身 dom.remove() 好
  parentNode.removeChild(oldDOM)

  // componentWillUnmount 生命周期（只有类组件才有 classComInstance 实例）
  if (oldVNode.classComInstance && oldVNode.classComInstance.componentWillUnmount) {
    oldVNode.classComInstance.componentWillUnmount()
  }
}

const deepDomDiff = (oldVNode, newVNode) => {
  const oldVNodeType = oldVNode.type

  const diffTypeMap = {
    // 原生节点
    ORIGIN_NODE: isTypeOf(oldVNodeType, 'String'),
    // 类组件
    CLASS_COMPONENT: isTypeOf(oldVNodeType, 'Function') && oldVNodeType.IS_CLASS_COMPONENT,
    // 函数组件
    FUNCTION_COMPONENT: isTypeOf(oldVNodeType, 'Function'),
    // 文本节点
    TEXT_NODE: oldVNodeType === REACT_TEXT,
    // memo
    MEMO: oldVNodeType.$$typeof === REACT_MEMO
  }

  // 使用 filter 过滤了，只有结果为 true 的才会被过滤出来。这里是取到第一个为 true 的 key
  const DIFF_TYPE = Object.keys(diffTypeMap).filter(key => diffTypeMap[key])[0]

  switch (DIFF_TYPE) {
    case 'ORIGIN_NODE':
      // 原生节点，其实后面 类组件、函数组件 最终都会走到这里来

      // 这里为什么 findDOMByVNode 是用 oldVNode？
      // 因为最终是要为了复用旧节点，所以需要先拿到旧的最外层的节点 dom
      const currentDOM = newVNode.dom = findDOMByVNode(oldVNode)
      // 更新属性
      setPropsForDOM(newVNode.props, currentDOM)
      // 比较子节点
      updateChildren(currentDOM, oldVNode.props.children, newVNode.props.children)
      break;
    case 'CLASS_COMPONENT':
      // 类组件
      updateClassComponent(oldVNode, newVNode)
      break;
    case 'FUNCTION_COMPONENT':
      // 函数组件
      updateFunctionComponent(oldVNode, newVNode)
      break;
    case 'TEXT_NODE':
      // 文本节点，直接将新的文本节点赋值给旧的文本节点
      newVNode.dom = findDOMByVNode(oldVNode)
      newVNode.dom.textContent = newVNode.props.text
      break;
    case 'MEMO':
      // memo 包裹的组件
      updateMemoCom(oldVNode, newVNode)
      break;
    default:
      break;
  }
}

// 更新子节点，diff 比较
// 验证：可以在浏览器用鼠标选中不变的节点，当触发更新，查看鼠标是否还是选中的节点
const updateChildren = (parentDOM, oldVNodeChildren, newVNodeChildren) => {
  oldVNodeChildren = (isTypeOf(oldVNodeChildren, 'Array') ? oldVNodeChildren : [oldVNodeChildren]).filter(Boolean)
  newVNodeChildren = (isTypeOf(newVNodeChildren, 'Array') ? newVNodeChildren : [newVNodeChildren]).filter(Boolean)

  // 记录当前处理过的节点中，最大的索引位置
  let lastNotChangedIndex = -1

  // 保存旧 VNode 的 key 和对应节点的关系
  const oldKeyChildMap = {}

  oldVNodeChildren.forEach((oldVNodeChild, index) => {
    // 先看有没有手动绑定 key: <div key="id"></div>，没有使用 index
    const oldKey = oldVNodeChild.key ? oldVNodeChild.key : index
    oldKeyChildMap[oldKey] = oldVNodeChild
  })

  // 保存操作动作，比如新增、删除等
  const actions = []

  /**
   * 遍历新的 VNode，找到：
   *  可以复用，但需要移动的节点
   *  需要新创建的节点
   *  需要删除的节点
   *  剩下的就是可以复用且不需要移动的节点
   */
  newVNodeChildren.forEach((newVNodeChild, index) => {
    newVNodeChild.index = index;
    const newKey = newVNodeChild.key ? newVNodeChild.key : index
    const oldVNodeChild = oldKeyChildMap[newKey]

    if (oldVNodeChild) {
      // 如果找到，需要进一步比较是否可以复用

      // 递归子节点
      deepDomDiff(oldVNodeChild, newVNodeChild)

      /**
       * 举例：
       * old: A B C D E
       * new:     C B E F A
       *   不动: C E，因为它们的索引是递增的
       *   移动: B A，因为它们的索引小于前面已处理节点的最大索引
       *   新增: F
       *   删除: D
       * 
       * 注意: 这里是遍历的新的 VNode，所以不动还是移动是相对于新 VNode 的
       *     比如这里，遍历的第一个是 C，那么后面所有的位置都是相对于新 VNode 的 C 来说的
       *     所以，这里的 dom diff 算法，在一些场景下存在性能问题的，比如: E A B C D，原来只需要移动 E 到开头，但是这里会除了 E 不动，其它全部移动了
       *     Vue3 的最长递增子序列就可以解决这个问题
       * 
       * 如果当前节点的索引小于 lastNotChangedIndex，说明需要移动
       * 这是因为在新的顺序中，当前节点在之前处理过的节点后面，但在旧的顺序中，它的位置却在前面
       * 比如 B，它在新的顺序中是在 C 后面，但在旧的顺序中，它的位置却在 C 前面
       * 
       * oldVNodeChild.index 的 index 是在 mountArray 时赋值的
       */
      if(oldVNodeChild.index < lastNotChangedIndex) {
        // 需要移动的节点
        actions.push({
          type: REACT_DIFF_MOVE,
          oldVNodeChild,
          newVNodeChild,
          index
        })
      } 

      // 删除 oldKeyChildMap 中处理过的节点
      delete oldKeyChildMap[newKey]
      // 注意，这里使用的是 oldVNodeChild 的 index
      lastNotChangedIndex = Math.max(oldVNodeChild.index, lastNotChangedIndex)
    } else {
      // 没找到，说明需要新建
      actions.push({
        type: REACT_DIFF_CREATE,
        newVNodeChild,
        index
      })
    }
  })

  // 需要移动的
  const VNodeMove = actions
    .filter(action => action.type === REACT_DIFF_MOVE)
    .map(action => action.oldVNodeChild)

  // delete oldKeyChildMap[newKey] 这一步没有删除完的，是需要删除的节点
  const VNodeDelete = Object.values(oldKeyChildMap)

  // 需要移动和删除的，都先删除
  VNodeMove.concat(VNodeDelete).forEach(oldVNode => {
    const currentDom = findDOMByVNode(oldVNode)
    currentDom.remove()
  })

  actions.forEach(action => {
    const { type, oldVNodeChild, newVNodeChild, index } = action

    const getDOMForInsert = () => {
      if (type === REACT_DIFF_CREATE) {
        return createDOM(newVNodeChild)
      }
      if (type === REACT_DIFF_MOVE) {
        return findDOMByVNode(oldVNodeChild)
      }
    }

    // 上面已经删除了需要删除和移动的，剩下的是不需要动的
    const childNodes = parentDOM.childNodes

    const childNode = childNodes[index]

    if (childNode) {
      // 如果通过 actions 的 index 如果能找到 childNode
      // 说明 actions 中元素位置被 childNode 的这个占据了，所以要在 childNode 前面插入
      parentDOM.insertBefore(getDOMForInsert(), childNode)
    } else {
      // 否则，直接往后面追加就可以
      parentDOM.appendChild(getDOMForInsert())
    }
  })
}

const updateClassComponent = (oldVNode, newVNode) => {
  // 类组件的实例是不会变的，新旧 VNode 都是同一个 class 实例
  const classComInstance = (newVNode.classComInstance = oldVNode.classComInstance)
  classComInstance.updater.launchUpdate(newVNode.props)
}

const updateFunctionComponent = (oldVNode, newVNode) => {
  // 这里必须将 dom 绑定到 newVNode 上，因为后面 updateDomTree 会用到
  const oldDOM = newVNode.dom = findDOMByVNode(oldVNode)
  if (!oldDOM) return
  const { type, props } = newVNode
  const newRenderVNode = type(props)

  updateDomTree(oldVNode.oldRenderVNode, newRenderVNode, oldDOM)
  newVNode.oldRenderVNode = newRenderVNode
}

const updateMemoCom = (oldVNode, newVNode) => {
  const { type, props } = newVNode

  // props 不是浅相等，更新
  if (!type.compare(oldVNode.props, newVNode.props)) {
    const oldDOM = findDOMByVNode(oldVNode)
    if (!oldDOM) return
    const newRenderVNode = type.type(props)
    updateDomTree(oldVNode.oldRenderVNode, newRenderVNode, oldDOM)
    newVNode.oldRenderVNode = newRenderVNode
  } else {
    newVNode.oldRenderVNode = oldVNode.oldRenderVNode
  }
}

const ReactDOM = {
  render
}

export default ReactDOM
