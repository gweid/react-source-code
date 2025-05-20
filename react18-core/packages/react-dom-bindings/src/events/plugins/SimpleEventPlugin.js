import { registerSimpleEvents, topLevelEventsToReactNames } from '../DOMEventProperties'
import { SyntheticMouseEvent } from '../SyntheticEvent'
import { IS_CAPTURE_PHASE } from '../EventSystemFlags'
import { accumulateSinglePhaseListeners } from '../DOMPluginEventSystem'

/**
 * 创建合成事件，收集事件监听函数，添加到 dispatchQueue 队列
 * @param {*} dispatchQueue 派发事件队列
 * @param {*} domEventName 事件名
 * @param {*} targetInst Fiber 节点
 * @param {*} nativeEvent 原生的浏览器 DOM 事件对象（如 MouseEvent）
 * @param {*} nativeEventTarget 获取触发事件目标元素
 * @param {*} eventSystemFlags 事件标志 冒泡|捕获
 * @param {*} targetContainer 目标元素（#root 节点）
 */
const extractEvents = (
  dispatchQueue,
  domEventName,
  targetInst,
  nativeEvent,
  nativeEventTarget,
  eventSystemFlags,
  targetContainer
) => {
  const reactName = topLevelEventsToReactNames.get(domEventName)

  let SyntheticEventCtor
  // 根据 DOM 事件名来确定要使用的合成事件构造函数
  switch (domEventName) {
    case 'click':
      SyntheticEventCtor = SyntheticMouseEvent
      break
    default:
      break
  }

  // 判断事件是否是捕获阶段
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0

  // 获取当前阶段的所有事件监听器（收集事件）
  const listeners = accumulateSinglePhaseListeners(
    targetInst,
    reactName,
    nativeEvent.type,
    isCapturePhase
  )

  if (listeners.length > 0) {
    // 创建一个合成事件（合成事件抹平了浏览器之间的差异）
    const event = new SyntheticEventCtor(
      reactName,
      domEventName,
      null,
      nativeEvent,
      nativeEventTarget
    )

    // 将合成事件与相应的监听器一起加入事件派发队列
    dispatchQueue.push({
      event,
      listeners
    })
  }
}

export {
  registerSimpleEvents as registerEvents,
  extractEvents
}
