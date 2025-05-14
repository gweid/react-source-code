/**
 * 调度器
 * @param {*} callback 
 */
export const scheduleCallback = (callback) => {
  // requestIdleCallback：在浏览器空闲时期调用回调函数
  // TODO：临时使用 requestIdleCallback，react 中实际上是自己实现了一个调度器，没有使用 requestIdleCallback
  requestIdleCallback(callback)
}
