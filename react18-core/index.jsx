// ----------------------- 实现 jsxDEV -----------------------
// const element = <div>hello react 18</div>
// console.log(element);


// ----------------------- 初始化渲染 -----------------------
// import { createRoot } from 'react-dom/client'

// const root = createRoot(document.getElementById('root'))

// const element = (
//   <div key='divKey'>
//     <h1>Hello, world!</h1>
//     <div style={{ color: 'red' }}>
//       你好
//       <p>p标签</p>
//     </div>
//     文本节点
//     <div>
//       <a href="https://github.com/gweid/react-source-code">github地址</a>
//     </div>
//   </div>
// )

// root.render(element)
// console.log(element)


// ----------------------- 函数组件的初始化渲染 -----------------------
import { createRoot } from 'react-dom/client'

const root = createRoot(document.getElementById('root'))

function FuncComponent() {
  return (
    <div key='divKey'>
      <h1>Hello, world!</h1>
      <div style={{ color: 'red' }}>
        你好
        <p>p标签</p>
      </div>
      文本节点
      <div>
        <a href="https://github.com/gweid/react-source-code">github地址</a>
      </div>
    </div>
  )
}

root.render(<FuncComponent />)
console.log(<FuncComponent />)