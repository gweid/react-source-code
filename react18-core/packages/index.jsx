// ----------------------- 实现 jsxDEV -----------------------
// const element = <div>hello react 18</div>
// console.log(element);


// ----------------------- 实现 createRoot -----------------------
import { createRoot } from 'react-dom/client'

const root = createRoot(document.getElementById('root'))

const element = (
  <div>
    <h1>Hello, world!</h1>
    <div style={{ color: 'red' }}>你好</div>
  </div>
)

root.render(element)
console.log(element)
