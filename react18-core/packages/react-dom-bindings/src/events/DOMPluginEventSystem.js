import { allNativeEvents } from './EventRegistry'
import * as simpleEventPlugin from './plugins/SimpleEventPlugin'
import { IS_CAPTURE_PHASE } from './EventSystemFlags'
import { createEventListenerWrapperWithPriority } from './ReactDOMEventListener'
import { addEventCaptureListener, addEventBubbleListener } from './EventListener'

// 注册所有的 SimpleEventPlugin 事件
simpleEventPlugin.registerEvents()

// 用于标记是否已经监听过
const listeningMarker = '_reactListening' + Math.random().toString(36).slice(2);


/**
 * 监听所有支持的事件
 * @param {*} rootContainerElement 就是 #root 节点，react 新版本会将事件委托到 #root，而不是 document
 */
export const listenToAllSupportedEvents = (rootContainerElement) => {
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true

    allNativeEvents.forEatch(domEventName => {
      listenToNativeEvent(domEventName, true, rootContainerElement)
      listenToNativeEvent(domEventName, false, rootContainerElement)
    })
  }
}

/**
 * 监听原生事件
 * @param {*} domEventName DOM 事件名称
 * @param {*} isCapturePhaseListener 是否在捕获阶段监听
 * @param {*} target 目标元素（#root 节点）
 */
const listenToNativeEvent = (domEventName, isCapturePhaseListener, target) => {
   let eventSystemFlags = 0
   
   /**
    * eventSystemFlags 标记是否是捕获阶段
    * 
    * isCapturePhaseListener 在​​注册事件监听器时​​，用于判断是否应该监听捕获阶段（addEventListener 的第三个参数 useCapture），仅在判断是否注册为捕获阶段时使用
    * 
    * eventSystemFlags 在事件触发的全流程中传递，二进制性能好，可以一个数字存储多个状态
    * 
    * 比如：
    *  const IS_PASSIVE = 1 << 1
    *  const IS_CAPTURE_PHASE = 1 << 2
    *  const flags = IS_PASSIVE | IS_CAPTURE_PHASE  // 结果是 6, 同时标记被动事件和捕获阶段
    * 如果只用布尔值，需要多个字段（如 isCapture、isPassive），而位掩码只需一个整数
    */
   if (isCapturePhaseListener) {
     eventSystemFlags |= IS_CAPTURE_PHASE
   }

   addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener)
}

/**
 * 将 react 合成事件添加到目标元素上，并处理捕获和冒泡事件
 * @param {*} targetContainer 目标元素（#root 节点）
 * @param {*} domEventName DOM 事件名称
 * @param {*} eventSystemFlags 捕获阶段标记
 * @param {*} isCapturePhaseListener 是否在捕获阶段监听
 */
const addTrappedEventListener = (targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener) => {
  // 生成一个带有优先级逻辑的 React 事件监听器（listener），用于处理合成事件
  // 根据事件类型设置不同的优先级
  const listener = createEventListenerWrapperWithPriority(targetContainer, domEventName, eventSystemFlags)

  if (isCapturePhaseListener) {
    addEventCaptureListener(targetContainer, domEventName, listener)
  } else {
    addEventBubbleListener(targetContainer, domEventName, listener)
  }
}
