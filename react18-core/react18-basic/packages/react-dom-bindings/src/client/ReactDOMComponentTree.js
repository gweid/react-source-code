const randomKey = Math.random().toString(36).slice(2)
const internalInstanceKey = '__reactFiber$' + randomKey
const internalPropsKey = "__reactProps$" + randomKey

/**
 * 在真实 DOM 节点添加 Fiber
 * @param {*} hostInst 就是 workInProgress
 * @param {*} node 真实 DOM 节点
 */
export const precacheFiberNode = (hostInst, node) => {
  node[internalInstanceKey] = hostInst
}

/**
 * 在真实 DOM 节点添加 props
 * @param {*} node 真实 DOM 节点
 * @param {*} props porps 属性
 */
export const updateFiberProps = (node, props) => {
  node[internalPropsKey] = props
}

/**
 * 获取真实 DOM 上的 props
 * @param {*} node 真实 DOM
 * @returns 真实 DOM 上的 props
 */
export function getFiberCurrentPropsFromNode(node) {
  return node[internalPropsKey] || null;
}

/**
 * 获取目标元素的 Fiber
 * @param {*} targetNode nativeEventTarget
 * @returns 目标元素的 Fiber
 */
export const getClosestInstanceFromNode = (targetNode) => {
  const targetInst = targetNode[internalInstanceKey]
  return targetInst
}
