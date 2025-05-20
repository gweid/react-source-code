import { HostComponent } from 'react-reconciler/src/ReactWorkTags'
import { IS_CAPTURE_PHASE } from './EventSystemFlags'
import { allNativeEvents } from './EventRegistry'
import * as simpleEventPlugin from './plugins/SimpleEventPlugin'
import { createEventListenerWrapperWithPriority } from './ReactDOMEventListener'
import { addEventCaptureListener, addEventBubbleListener } from './EventListener'
import getEventTarget from './getEventTarget'
import getListener from './getListener'

// 注册所有的 SimpleEventPlugin 事件
simpleEventPlugin.registerEvents()

// 用于标记是否已经监听过
const listeningMarker = '_reactListening' + Math.random().toString(36).slice(2);


/**
 * 监听所有支持的事件，react 事件系统的入口
 * 在 createRoot 函数中进行调用
 * @param {*} rootContainerElement 就是 #root 节点，react 新版本会将事件委托到 #root，而不是 document
 */
export const listenToAllSupportedEvents = (rootContainerElement) => {
  if (!rootContainerElement[listeningMarker]) {
    rootContainerElement[listeningMarker] = true

    allNativeEvents.forEach(domEventName => {
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

/**
 * 为事件插件系统派发事件
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 事件标记，捕获 | 冒泡
 * @param {*} nativeEvent 原生的浏览器 DOM 事件对象（如 MouseEvent）
 * @param {*} targetInst 触发事件源的元素的 Fiber
 * @param {*} targetContainer 目标元素（#root 节点）
 */
export const dispatchEventForPluginEventSystem = (
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) => {
  dispatchEventForPlugins(
    domEventName,
    eventSystemFlags,
    nativeEvent,
    targetInst,
    targetContainer
  )
}

/**
 * 派发事件
 * @param {*} domEventName 事件名
 * @param {*} eventSystemFlags 事件标记，捕获 | 冒泡
 * @param {*} nativeEvent 原生的浏览器 DOM 事件对象（如 MouseEvent）
 * @param {*} targetInst 触发事件源的元素的 Fiber
 * @param {*} targetContainer 目标元素（#root 节点）
 */
const dispatchEventForPlugins = (
  domEventName,
  eventSystemFlags,
  nativeEvent,
  targetInst,
  targetContainer
) => {
  // 获取触发事件目标元素
  const nativeEventTarget = getEventTarget(nativeEvent)

  const dispatchQueue = []

  // 创建合成事件，收集事件监听函数，添加到 dispatchQueue 队列
  extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )

  // 处理事件派发队列
  processDispatchQueue(dispatchQueue, eventSystemFlags)
}

/**
 * 创建合成事件，收集事件监听函数，添加到 dispatchQueue 队列
 * @param {*} dispatchQueue 事件派发队列
 * @param {*} domEventName 事件名
 * @param {*} targetInst 触发事件源的元素的 Fiber
 * @param {*} nativeEvent 原生的浏览器 DOM 事件对象（如 MouseEvent）
 * @param {*} nativeEventTarget 触发事件目标元素
 * @param {*} eventSystemFlags 事件标记，捕获 | 冒泡
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

  // 创建合成事件，收集事件监听函数，添加到 dispatchQueue 队列
  simpleEventPlugin.extractEvents(
    dispatchQueue,
    domEventName,
    targetInst,
    nativeEvent,
    nativeEventTarget,
    eventSystemFlags,
    targetContainer
  )
}

/**
 * 处理事件派发队列
 * @param {*} dispatchQueue 事件派发队列
 * @param {*} eventSystemFlags 事件标记 捕获 | 冒泡
 */
const processDispatchQueue = (dispatchQueue, eventSystemFlags) => {
  // 判断是否在捕获阶段
  const isCapturePhase = (eventSystemFlags & IS_CAPTURE_PHASE) !== 0

  for (let i = 0; i < dispatchQueue.length; i++) {
    const { event, listeners } = dispatchQueue[i]

    // 按顺序处理事件派发队列中的事件
    processDispatchQueueItemsInOrder(event, listeners, isCapturePhase)
  }
}

/**
 * 按顺序处理事件派发队列中的事件
 * @param {*} event 合成事件
 * @param {*} dispatchListeners 事件派发队列
 * @param {*} isCapturePhase 是否捕获
 * @returns 
 */
const processDispatchQueueItemsInOrder = (event, dispatchListeners, isCapturePhase) => {
  if (isCapturePhase) {
    // 捕获阶段，从后往前处理
    for (let i = dispatchListeners.length - 1; i >= 0; i--) {
      const { listener, currentTarget } = dispatchListeners[i]

      // 如果阻止了时间的传播，那么停止
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget)
    }
  } else {
    // 冒泡阶段，从前往后处理
    for (let i = 0; i < dispatchListeners.length; i++) {
      const { listener, currentTarget } = dispatchListeners[i]

      // 如果阻止了时间的传播，那么停止
      if (event.isPropagationStopped()) {
        return;
      }
      executeDispatch(event, listener, currentTarget)
    }
  }
}

/**
 * 执行派发的事件
 * @param {*} event 
 * @param {*} listener 
 * @param {*} currentTarget 
 */
const executeDispatch = (event, listener, currentTarget) => {
  event.currentTarget = currentTarget
  listener(event)
}

/**
 * 层层向上遍历 Fiber 节点，收集所有事件监听函数
 * @param {*} targetFiber 目标Fiber实例
 * @param {*} reactName React事件名称
 * @param {*} nativeEventType 原生事件类型
 * @param {*} isCapturePhase 是否在捕获阶段
 * @returns
 */
export const accumulateSinglePhaseListeners = (
  targetFiber,
  reactName,
  nativeEventType,
  isCapturePhase
) => {
  const captureName = reactName + 'Capture'
  
  const reactEventName = isCapturePhase ? captureName : reactName

  const listeners = []

  let instance = targetFiber

  // 向上遍历 Fiber 树，收集事件监听器
  while (instance !== null) {
    const { stateNode, tag } = instance

    if (tag === HostComponent && stateNode !== null) {

      const listener = getListener(instance, reactEventName)

      if (listener) {
        listeners.push(createDispatchListener(instance, listener, stateNode))
      }
    }

    instance = instance.return
  }

  return listeners
}

/**
 * 创建派发监听函数
 * @param {*} instance Fiber实例
 * @param {*} listener 监听器函数
 * @param {*} currentTarget 当前目标元素
 * @returns 
 */
const createDispatchListener = (instance, listener, currentTarget) => {
  return {
    instance,
    listener,
    currentTarget
  }
}
