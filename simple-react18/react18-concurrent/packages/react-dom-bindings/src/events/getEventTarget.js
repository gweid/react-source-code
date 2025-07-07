/**
 * 获取原生事件的目标元素
 * 如果原生事件没有目标元素，则尝试获取事件的 `srcElement`，如果仍然没有，则返回全局 `window` 对象
 * target 和 srcElement 是一样的，srcElement 主要是为了兼容 IE8 及更早的浏览器
 * @param {*} nativeEvent 原生的浏览器 DOM 事件对象（如 MouseEvent）
 * @returns 目标元素
 */
const getEventTarget = (nativeEvent) => {
  const target = nativeEvent.target || nativeEvent.srcElement || window
  return target
}

export default getEventTarget
