import { push, peek, pop } from '../SchedulerMinHeap'
import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority
} from '../SchedulerPriorities'


const maxSigned31BitInt = 1073741823               // 相当于二进制最大值：0b1111111111111111111111111111111
const IMMEDIATE_PRIORITY_TIMEOUT = -1              // 立即超时（那么立即渲染）
const USER_BLOCKING_PRIORITY_TIMEOUT = 250         // 用户阻塞优先级，250ms 超时
const NORMAL_PRIORITY_TIMEOUT = 5000               // 正常优先级，5000ms 超时
const LOW_PRIORITY_TIMEOUT = 10000                 // 低优先级，10000ms 超时
const IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt    // 空闲优先级，最大值，从不超时


let taskIdCounter = 1                              // 任务 id 计数器
const taskQueue = []                               // 任务队列（最小堆算法）

let scheduleHostCallback = null                    // 调度主机回调函数

let startTime = -1                                 // 执行工作循环开始时间
let currentTask = null                             // 当前正在执行的任务

/**
 * 任务时间分片大小：5ms
 *  - 小于 5ms：时间片太小，任务切换开销相对较大
 *  - 大于 5ms：可能导致用户交互延迟感知（人类能感知到约 16.7ms 以上的延迟）
 * 
 * 60fps 的显示器每帧约 16.7ms
 * 5ms 允许 React 在一帧内完成工作，同时留出足够时间给浏览器处理其他任务
 */
const frameInterval = 5


/**
 * MessageChannel 通讯的基本使用
 * 
 * port1 和 port2 可以互相发送消息，实现全双工通信
 *
 * 
 * const channel = new MessageChannel()
 * 
 * // 端口1 发送消息到端口2
 * channel.port1.postMessage("Ping")
 * 
 * // 端口2 监听消息
 * channel.port2.onmessage = (event) => {
 *   console.log("Port2 received:", event.data) // "Ping"
 *   channel.port2.postMessage("Pong")
 * }
 * 
 * // 端口1 接收回复
 * channel.port1.onmessage = (event) => {
 *   console.log("Port1 received:", event.data) // "Pong"
 * }
 * 
 */
const channel = new MessageChannel()
const port2 = channel.port2
const port1 = channel.port1
port1.onmessage = performWorkUntilDeadline


/**
 * 调度回调函数
 * @param {ImmediatePriority | UserBlockingPriority | NormalPriority | LowPriority | IdlePriority} priorityLevel 优先级
 * @param {*} callback 回调函数
 */
export const scheduleCallback = (priorityLevel, callback) => {

  const currentTime = getCurrentTime()

  const startTime = currentTime

  let timeout

  switch (priorityLevel) {
    case ImmediatePriority:
      // 立即超时，优先级最高
      timeout = IMMEDIATE_PRIORITY_TIMEOUT
      break
    case UserBlockingPriority:
      // 用户阻塞优先级，250ms 超时
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT
      break
    case IdlePriority:
      // 空闲优先级，最大值，从不超时
      timeout = IDLE_PRIORITY_TIMEOUT
      break
    case LowPriority:
      // 低优先级，10000ms 超时
      timeout = LOW_PRIORITY_TIMEOUT
      break
    case NormalPriority:
    default:
      // 正常优先级，5000ms 超时
      timeout = NORMAL_PRIORITY_TIMEOUT
      break
  }

  // 计算任务的过期时间：当前时间 + 超时时间
  const expirationTime = startTime + timeout

  // 创建一个任务
  // id 和 sortIndex 会在最小堆算法比较函数 compare 中使用
  const newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: expirationTime
  }

  // 将任务添加到队列中（最小堆算法）
  push(taskQueue, newTask)

  // 添加完任务进队列，就是开始使用了
  requestHostCallback(workLoop)

  return newTask
}

/**
 * 获取当前时间
 * @returns 当前时间
 */
const getCurrentTime = () => {
  // 获取高精度时间，返回一个以毫秒为单位的时间戳
  return performance.now()
}

/**
 * 请求调度主机回调函数
 * @param {*} workLoop 工作循环函数
 */
const requestHostCallback = (workLoop) => {
  scheduleHostCallback = workLoop

  schedulePerformWorkUntilDeadline()
}

/**
 * 工作循环，执行任务队列中的任务
 * @param {*} startTime 工作循环的开始时间
 * @returns 如果还有未完成的任务，返回 true；否则返回 false
 */
const workLoop = (startTime) => {
  let currentTime = startTime

  // 取出（堆顶）任务队列中的第一个任务
  currentTask = peek(taskQueue)

  while (currentTask) {
    // 如果当前任务未过期，但是应该交还控制权给主机（浏览器没时间了），则停止执行
    // shouldYieldToHost 通过将每帧 16.7ms 分配 5 ms 给 react 执行
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      break
    }

    const callback = currentTask.callback

    if (typeof callback === 'function') {
      currentTask.callback = null

      // 判断当前任务是否过期
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime

      // 执行任务回调函数，并传入是否超时的标志
      // 这是 react 实现 中断与恢复机制 的关键
      const continuationCallback = callback(didUserCallbackTimeout)

      // 如果回调返回函数，表示任务需要继续
      if (typeof continuationCallback === 'function') {
        // 保存任务到 currentTask.callback，任务将在下一个时间片继续
        currentTask.callback = continuationCallback;
        return true
      }

      // 没有保存新任务到 currentTask.callback
      // 那么 currentTask 与 peek(taskQueue) 相等
      // 表示当前任务已经执行完毕，从堆顶移除
      if (currentTask === peek(taskQueue)) {
        pop(taskQueue)
      }
    } else {
      // callback 不是函数，从堆顶移除
      pop(taskQueue)
    }

    currentTask = peek(taskQueue)
  }

  // 为什么需要这一步，因为 while 循环中，会判断：
  // 如果当前任务未过期，但是应该交还控制权给主机（浏览器没时间了），会中断循环
  // 那么就代表任务还没执行完
  if (currentTask !== null) return true

  return false
}

/**
 * 判断是否应该交还控制权给主机
 * @returns 如果应该交还控制权给主机，则返回 true；否则返回 false
 */
const shouldYieldToHost = () => {
  // 计算当前时间与执行工作循环开始时间的差值
  const timeElapsed = getCurrentTime() - startTime

  // 如果时间差小于时间分片间隔，则不交还控制权给主机
  if (timeElapsed < frameInterval) return false

  return true
}

/**
 * 调度执行工作直到截止时间
 */
const schedulePerformWorkUntilDeadline = () => {
  /**
   * 这里为什么使用 MessageChannel，其实是优先级问题
   * 在浏览器中：同步任务 -> 微任务 -> MessageChannel -> 宏任务
   *
   * 使用 MessageChannel 比使用 setTimeout 更早执行
   * 而且就算 setTimeout 设置为 0，也只是最小值，在大多数浏览器中是 4ms
   * 
   * 其次，如果还有任务没有执行完，通过 postMessage 通知触发任务执行，将这个任务加入到事件循环队列
   * 等待下一次事件循环执行
   */
  port2.postMessage(null)
}

/**
 * 执行工作直到截止时间
 * 这个是 port1.onmessage 绑定的监听函数
 */
function performWorkUntilDeadline() {
  if (scheduleHostCallback) {
    startTime = getCurrentTime()

    let hasMoreWork = true

    try {
      hasMoreWork = scheduleHostCallback(startTime)
    } finally {
      // 如果还有工作，继续通过 schedulePerformWorkUntilDeadline 调度执行
      if (hasMoreWork) {
        schedulePerformWorkUntilDeadline()
      } else {
        scheduleHostCallback = null
      }
    }
  }
}

export {
  scheduleCallback as unstable_scheduleCallback,
  shouldYieldToHost as unstable_shouldYield,
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  LowPriority as unstable_LowPriority,
  IdlePriority as unstable_IdlePriority
}
