import { registerTwoPhaseEvent } from './EventRegistry'

// 事件数组，这里只实现一个点击事件
const simpleEventPluginEvents = ['click']

// 使用一个 Map 来存储原生事件名与 react 事件名的映射关系
export const topLevelEventsToReactNames = new Map()

/**
 * 注册简单事件 SimpleEvent
 * @param {*} domEventName 原生事件名
 * @param {*} reactName react 事件名依赖的 DOM 事件数组
 */
const registerSimpleEvent = (domEventName, reactName) => {
  // 存储原生事件名与 react 事件名的映射关系
  topLevelEventsToReactNames.set(domEventName, reactName)

  // 注册两阶段的事件（包括捕获和冒泡阶段）
  registerTwoPhaseEvent(reactName, [domEventName])
}

/**
 * 注册所有的 simpleEventPluginEvents 数组中的所有事件
 */
export const registerSimpleEvents = () => {
  for (let i =0; i < simpleEventPluginEvents.length; i++) {
    const eventName = simpleEventPluginEvents[i]

    // 事件名为转换小写
    const domEventName = eventName.toLowerCase()

    // 事件名首字母大写
    const capitalizeEvent = domEventName[0].toUpperCase() + domEventName.slice(1)

    registerSimpleEvent(domEventName, `on${capitalizeEvent}`)
  }
}
