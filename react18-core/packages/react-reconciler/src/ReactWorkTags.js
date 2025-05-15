export const FunctionComponent = 0 // 表示函数组件
export const ClassComponent = 1 // 表示类组件
export const IndeterminateComponent = 2 // 表示尚未确定类型的组件，在 React 渲染过程中，如遇到这种类型，会先尝试当做函数组件处理
export const HostRoot = 3 // 表示宿主环境的根节点，例如在浏览器环境中，这个就代表了整个 React App 的根节点，对应 RootFiber
export const HostComponent = 5 // 表示原生 DOM 节点，如 div、span 等
export const HostText = 6 // 表示文本节点
