import { emitUpdateForHooks } from './react-dom'

const states = []
let hookIndex = 0

export const resetHookIndex = () => {
  hookIndex = 0
}

export const useState = (initValue) => {
  states[hookIndex] = states[hookIndex] || initValue

  // 保存当前的索引，相当于一个闭包
  const currentIndex = hookIndex

  const setState = (newState) => {
    states[currentIndex] = newState

    // 数据更新了，执行页面更新（是从根节点开始更新的）
    emitUpdateForHooks()
  }

  // 这是因为，会多次使用 useState，此时就需要更新存储的索引
  hookIndex++

  return [states[currentIndex], setState]
}

export const useReducer = (reducer, initValue) => {
  states[hookIndex] = states[hookIndex] || initValue

  let currentIndex = hookIndex

  const dispatch = (action) => {
    states[currentIndex] = reducer(states[currentIndex], action)
    emitUpdateForHooks()
  }

  hookIndex++

  return [states[currentIndex], dispatch]
}

export const useEffect = (effectFn, deps = []) => {
  const currentIndex = hookIndex;

  const [destoryFn, preDeps] = states[currentIndex] || [null, null]

  // 第一次调用或者传入的 deps 发生变化，那么需要执行 effectFn
  if (!states[currentIndex] || deps.some((item, index) => item !== preDeps[index])) {
    // useEffect 的执行时机是 DOM 渲染完成后，这里简单使用 setTimeout 模拟一下
    setTimeout(() => {
      destoryFn && destoryFn()
      // 执行 effectFn，并将 effectFn 的结果（一个卸载函数）保存起来
      states[currentIndex] = [effectFn(), deps]
    }, 4)
  }

  hookIndex++
}

export const useLayoutEffect = (effectFn, deps = []) => {
  const currentIndex = hookIndex;

  const [destoryFn, preDeps] = states[currentIndex] || [null, null]

  // 第一次调用或者传入的 deps 发生变化，那么需要执行 effectFn
  if (!states[currentIndex] || deps.some((item, index) => item !== preDeps[index])) {
    // useLayoutEffect 的执行时机是 DOM 渲染完成之前，会阻塞渲染，这里使用 queueMicrotask 模拟一下
    // queueMicrotask：用于将微任务加入微任务队列，微任务不会让出主线程​，会阻塞渲染，直到队列清空
    queueMicrotask(() => {
      destoryFn && destoryFn()
      // 执行 effectFn，并将 effectFn 的结果（一个卸载函数）保存起来
      states[currentIndex] = [effectFn(), deps]
    }, 4)
  }

  hookIndex++
}

export const useRef = (initValue) => {
  states[hookIndex] = states[hookIndex] || { current: initValue }

  const currrentIndex = hookIndex

  hookIndex++

  return states[currrentIndex]
}
