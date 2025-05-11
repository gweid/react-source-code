import { emitUpdateForHooks } from './react-dom'

const state = []
let hookIndex = 0

export const resetHookIndex = () => {
  hookIndex = 0
}

export const useState = (initValue) => {
  state[hookIndex] = state[hookIndex] || initValue

  // 保存当前的索引，相当于一个闭包
  const currentIndex = hookIndex

  const setState = (newState) => {
    state[currentIndex] = newState

    // 数据更新了，执行页面更新（是从根节点开始更新的）
    emitUpdateForHooks()
  }

  // 这是因为，会多次使用 useState，此时就需要更新存储的索引
  hookIndex++

  return [state[currentIndex], setState]
}
