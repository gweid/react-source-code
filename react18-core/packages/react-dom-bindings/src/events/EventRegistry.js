// 所有事件（使用 set 数据结构，有去重作用）
export const allNativeEvents = new Set()

/**
 * 注册一个两阶段的事件（事件捕获和冒泡阶段）
 * 
 * 主要是分离捕获和冒泡逻辑​，捕获和冒泡阶段需要不同的处理逻辑（例如事件触发顺序、是否阻止传播）
 * 
 * @param {*} registrationName 需要注册的 react 事件名
 * @param {*} dependencies 原生事件名数组
 */
export const registerTwoPhaseEvent = (registrationName, dependencies) => {
  // 注册冒泡阶段的事件
  registerDirectEvent(registrationName, dependencies)

  // 注册捕获阶段的事件，通过在事件名称后添加 'Capture' 后缀来区分
  registerDirectEvent(registrationName + 'Capture', dependencies)
}

export const registerDirectEvent = (registrationName, dependencies) => {
  for (let i = 0; i < dependencies.length; i++) {
    // 将每个依赖事件添加到 allNativeEvents Set 中
    allNativeEvents.add(dependencies[i])
  }
}
