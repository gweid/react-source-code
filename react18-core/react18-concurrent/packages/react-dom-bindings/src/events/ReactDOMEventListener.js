import getEventTarget from './getEventTarget'
import { getClosestInstanceFromNode } from '../client/ReactDOMComponentTree'
 import { dispatchEventForPluginEventSystem } from './DOMPluginEventSystem'
import { DiscreteEventPriority, ContinuousEventPriority, DefaultEventPriority } from 'react-reconciler/src/ReactEventPriorities'

/**
 * 创建一个具有优先级的事件监听器包装器
 * @param {*} targetContainer 目标元素（#root 节点）
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 事件系统标志，用于表示 冒泡|捕获 阶段
 * @returns 绑定了特定参数的事件调度函数
 */
export const createEventListenerWrapperWithPriority = (
  targetContainer,
  domEventName,
  eventSystemFlags
) => {
  const listenerWrapper = dispatchDiscreteEvent
  return listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer)
}

/**
 * 派发事件入口
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 事件系统标志，用于表示 冒泡|捕获 阶段
 * @param {*} container 目标元素（#root 节点）
 * @param {*} nativeEvent 原生的浏览器 DOM 事件对象（如 MouseEvent）
 */
const dispatchDiscreteEvent = (
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) => {
  dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent)
}

/**
 * 派发事件
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 事件系统标志，用于表示 冒泡|捕获 阶段
 * @param {*} targetContainer 目标元素（#root 节点）
 * @param {*} nativeEvent 原生的浏览器 DOM 事件对象（如 MouseEvent）
 */
const dispatchEvent = (
  domEventName,
  eventSystemFlags,
  targetContainer,
  nativeEvent
) => {
  // 获取触发事件目标元素
  const nativeEventTarget = getEventTarget(nativeEvent)

  // 获取获取触发事件目标元素的 Fiber
  // 在 createInstance 中调用 precacheFiberNode 给真实 DOM 绑定了 Fiber
  const targetInst = getClosestInstanceFromNode(nativeEventTarget)

  dispatchEventForPluginEventSystem(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  )
}

/**
 * 根据事件名获取事件优先级
 * @param {*} domEventName 事件名
 * @returns 事件优先级
 */
export const getEventPriority = (domEventName) => {
  switch (domEventName) {
    case 'click':
      return DiscreteEventPriority
    case 'drag':
      return ContinuousEventPriority
    default:
      return DefaultEventPriority
  }
}
