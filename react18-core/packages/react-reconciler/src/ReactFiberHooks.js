/**
 * 获取函数组件的虚拟 DOM
 * @param {*} current 当前屏幕上显示的内容对应的 Fiber 树
 * @param {*} workInProgress 正在构建的 Fiber 树
 * @param {*} Component 函数组件的函数 () => {}
 * @param {*} props 属性 props
 * @returns 
 */
export function renderWithHooks(current, workInProgress, Component, props) {
  const children = Component(props)
  return children
}
