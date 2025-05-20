/**
 * 在目标元素上添加捕获事件
 * @param {*} target 目标元素（#root 节点）
 * @param {*} eventType 事件类型（事件名称）
 * @param {*} listener 监听器函数
 * @returns 返回添加的监听器
 */
export const addEventCaptureListener = (target, eventType, listener) => {
  target.addEventListener(eventType, listener, true)
  return listener
}

/**
 * 在目标元素上添加冒泡事件
 * @param {*} target 目标元素（#root 节点）
 * @param {*} eventType 事件类型（事件名称）
 * @param {*} listener 监听器函数
 * @returns 返回添加的监听器
 */
export const addEventBubbleListener = (target, eventType, listener) => {
  target.addEventListener(eventType, listener, false)
  return listener
}
