// ----------------------- 实现 jsxDEV -----------------------
// const element = <div>hello react 18</div>
// console.log(element);


// ----------------------- 初始化渲染 -----------------------
import { createRoot } from 'react-dom/client'

const root = createRoot(document.getElementById('root'))

const Com = () => {
  return (
    <div>组件</div>
  )
}

const element = (
  <div key='divKey'>
    <h1>Hello, world!</h1>
    <div style={{ color: 'red' }}>
      你好
      <p>p标签</p>
    </div>
    文本节点
    <Com>
      <span>组件的 children</span>
    </Com>
    <img src="" alt="空图片" />
  </div>
)

root.render(element)
console.log(element)
