// ----------------------- 实现 jsxDEV -----------------------
// const element = <div>hello react 18</div>
// console.log(element)


// ----------------------- 初始化渲染 -----------------------
// import { createRoot } from 'react-dom/client'

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

// const root = createRoot(document.getElementById('root'))
// root.render(element)
// console.log(element)


// ----------------------- 函数组件的初始化渲染 -----------------------
// import { createRoot } from 'react-dom/client'

// const root = createRoot(document.getElementById('root'))

// function FuncComponent() {
//   return (
//     <div key='divKey'>
//       <h1>Hello, world!</h1>
//       <div style={{ color: 'red' }}>
//         你好
//         <p>p标签</p>
//       </div>
//       文本节点
//       <div>
//         <a href="https://github.com/gweid/react-source-code">github地址</a>
//       </div>
//     </div>
//   )
// }

// root.render(<FuncComponent />)
// console.log(<FuncComponent />)


// ----------------------- 合成事件系统 -----------------------
// import { createRoot } from 'react-dom/client'

// function FuncComponent() {
//   const handleParentClick = (e) => {
//     console.log('父节点')
//   }

//   const handleParentClickCapture = (e) => {
//     console.log('父节点capture')
//   }

//   const handleChildClick = (e) => {
//     console.log('子节点')
//     // e.stopPropagation()
//   }

//   const handleChildClickCapture = (e) => {
//     console.log('子节点capture')
//   }

//   return (
//     <div
//       style={{ width: '200px', height: '200px', border: '1px solid #ccc'}}
//       onClick={handleParentClick}
//       onClickCapture={handleParentClickCapture}
//     >
//       <button
//         onClick={handleChildClick}
//         onClickCapture={handleChildClickCapture}
//       >
//         子节点
//       </button>
//     </div>
//   )
// }

// const root = createRoot(document.getElementById('root'))
// root.render(<FuncComponent />)


// ----------------------- useReducer -----------------------
import { useReducer } from 'react'
import { createRoot } from 'react-dom/client'

function getNum(state, action) {
  switch (action.type) {
    case 'add':
      return state + action.payload
    default:
      return state
  }
}

function FuncComponent() {
  const [num, setNum] = useReducer(getNum, 0)

  const handleAdd = () => {
    setNum({ type: 'add', payload: 1 })
  }

  return (
    // <div>
    //   <button onClick={handleAdd}>num++：{num}</button>
    // </div>

    // 这里只能先这样，不能像上面那样，因为上面那样在 react 中的 
    // diffProperties 处理子节点 children 时 nextProp 会被处理成数组，现在还不支持数组
    <div>
        <button onClick={handleAdd}>{num}</button>
    </div>
  )
}

const root = createRoot(document.getElementById('root'))
root.render(<FuncComponent />)
