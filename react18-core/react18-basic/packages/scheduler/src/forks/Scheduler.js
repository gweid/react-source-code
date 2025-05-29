/**
 * 调度回调函数
 * @param {*} callback 回调函数
 */
export const scheduleCallback = (callback) => {
  // 后面会实现这个调度系统，现在暂时使用 requestIdleCallback 来模拟
  requestIdleCallback(callback)
}
