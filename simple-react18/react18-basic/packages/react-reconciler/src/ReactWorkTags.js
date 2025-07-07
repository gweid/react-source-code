export const FunctionComponent = 0 // 表示函数组件
export const ClassComponent = 1 // 表示类组件
export const IndeterminateComponent = 2 // 表示尚未确定类型的组件，在 React 渲染过程中，如遇到这种类型，会先尝试当做函数组件处理
export const HostRoot = 3 // RootFiber，代表 ​​React 应用的根节点​​，即 ReactDOM.createRoot() 或 ReactDOM.render() 挂载的 DOM 容器（#root）
export const HostComponent = 5 // 表示原生 DOM 节点，如 div、span 等
export const HostText = 6 // 表示文本节点
