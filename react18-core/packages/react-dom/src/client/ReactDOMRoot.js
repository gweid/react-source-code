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
 * render 方法，负责更新或渲染 React 组件树
 * @param {*} children 需要渲染的 React 元素或组件（虚拟 DOM）
 * 
 * 这里不用箭头函数，因为箭头函数的 this 指向的不是 ReactDOMRoot 构造函数
 */
ReactDOMRoot.prototype.render = function(children) {
  const root = this._internalRoot

  /**
   * updateContainer 就是整个渲染的入口
   * 
   * 流程：虚拟 DOM --> Fiber 树 --> 真实 DOM --> 挂载
   * 
   * children：虚拟 DOM
   * root：不完全是真实 DOM，而是经过处理的 FiberRoot
   */
  updateContainer(children, root)
}

/**
 * 创建 FiberRoot
 * @param {*} container 真实 DOM （root根节点）节点
 * @returns FiberRoot
 */
export const createRoot = (container) => {
  // 根据真实 DOM （root根节点）节点创建 Fiber 树的根节点
  // root 是 FiberRoot，root.current 是 RootFiber
  const root = createContainer(container)

  return new ReactDOMRoot(root)
}
