import {
  createContainer,
  updateContainer
} from "react-reconciler/src/ReactFiberReconciler"

/**
 * ReactDOMRoot 构造函数
 * @param {*} internalRoot React Fiber树的根节点
 * 
 * 这里不能用箭头函数，箭头函数不能做构造函数
 */
function ReactDOMRoot(internalRoot) {
  this._internalRoot = internalRoot
}

/**
 * render方法，负责更新或渲染React组件树
 * @param {*} children 需要渲染的React元素或组件
 * 
 * 这里不用箭头函数，因为箭头函数的 this 指向的不是 ReactDOMRoot 构造函数
 */
ReactDOMRoot.prototype.render = function(children) {
  const root = this._internalRoot

  // 将虚拟 DOM 节点挂载到真实 DOM root 上
  // 这里的 root 不完全是真实 DOM，而是经过 fiber 处理的
  updateContainer(children, root)
}

/**
 * 创建 fiberRoot
 * @param {*} container 真实 DOM （root根节点）节点
 * @returns 
 */
export const createRoot = (container) => {
  // 根据真实 DOM （root根节点）节点创建 Fiber 树的根节点
  const root = createContainer(container)

  return new ReactDOMRoot(root)
}
