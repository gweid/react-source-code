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
 * 
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 事件系统标志，用于表示 冒泡|捕获 阶段
 * @param {*} container 目标元素（#root 节点）
 * @param {*} nativeEvent 原生的浏览器事件对象，就是触发事件的事件源
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
 * 
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 事件系统标志，用于表示 冒泡|捕获 阶段
 * @param {*} container 目标元素（#root 节点）
 * @param {*} nativeEvent 原生的浏览器事件对象，就是触发事件的事件源
 */
const dispatchEvent = (
  domEventName,
  eventSystemFlags,
  container,
  nativeEvent
) => {

}