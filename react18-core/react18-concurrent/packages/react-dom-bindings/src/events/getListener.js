import { getFiberCurrentPropsFromNode } from '../client/ReactDOMComponentTree'

/**
 * 从给定的 Fiber 实例中获取指定事件的监听函数
 * @param {*} instance Fiber 实例
 * @param {*} registrationName 注册的事件名（例如，'onClick'）
 * @returns 返回该事件的监听函数
 */
const getListener = (instance, registrationName) => {
  const { stateNode } = instance

  if (stateNode === null) return null

  // 根据真实 DOM 获取挂载在真实 DOM 上的 props
  // 在初始化阶段或者更新阶段的 completeWork 中，都会将 props 挂载到真实 DOM 上
  const props = getFiberCurrentPropsFromNode(stateNode)

  if (props === null) return null

  // 转换为虚拟 DOM 时会将绑定的事件名和事件函数放到 props 上
  const listener = props[registrationName]

  return listener
}

export default getListener
