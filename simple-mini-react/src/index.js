// import React from 'react';
// import ReactDOM from 'react-dom'; // react16.x 版本
// import ReactDOM from 'react-dom/client'; // react18.x 版本
import React from './mini-react/react';
import ReactDOM from './mini-react/react-dom';

// react 18.x 版本
// const root = ReactDOM.createRoot(document.getElementById('root'));
// root.render(<div>react demo</div>); 
 
// react16.x 版本
// const root = document.getElementById('root');
// ReactDOM.render(<div key="once" ref="divBox" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>, root);
 
// 手动实现的 react
const root = document.getElementById('root');

// -------------------- 普通标签
// ReactDOM.render(<div key="once" ref="divBox" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>, root);
// console.log(<div key="once" ref="divBox" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>);


// -------------------- 函数组件
// const MyFuncCom = (props) => {
//   return (
//     <div key="once" ref="divBox" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>
//   )
// };
// ReactDOM.render(<MyFuncCom name='my-func-com' />, root);
// console.log(<MyFuncCom name='my-func-com' />);


// -------------------- 类组件
class MyClassCom extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      age: 18,
      count: 0
    }

    this.divRef = React.createRef()
    this.compRef = React.createRef()
    this.funcCompRef = React.createRef()
  }

  handleParentClick() {
    console.log('点击冒泡到父元素');
  }

  handleClick(e) {
    // 阻止冒泡
    e.stopPropagation()

    this.setState({
      count: this.state.count + 1
    })
  }

  handleDivRefClick() {
    console.log(this.divRef.current.innerText)
  }

  handleCompRefClick() {
    this.compRef.current.handleAdd(10)
  }

  render() {
    return (
      <div key="once" style={{color: '#333' }}>
        <div>
          <span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>
          子节点
        </div>
        <div>年龄：{this.state.age}</div>
        <div>计数器：{this.state.count}</div>
        <div onClick={this.handleParentClick}>
          <button onClick={(e) => this.handleClick(e)}>点击事件，计数器++</button>
        </div>
        <div>
          <h1>------- ref -------</h1>
          <div ref={this.divRef} onCli ck={() => this.handleDivRefClick()}>普通标签ref</div>

          <button onClick={() => this.handleCompRefClick()}>组件的ref</button>
          <RefComp ref={this.compRef} />
          <FuncCompRef ref={this.funcCompRef} />
        </div>
      </div>
    )
  }
};

class RefComp extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      num: 0
    }
  }

  handleAdd(num) {
    this.setState({
      num: this.state.num + num
    })
  }

  render() {
    return (
      <div>
        <p>数值：{this.state.num}</p>
        <button onClick={() => this.handleAdd(1)}>+1</button>
      </div>
    )
  }
}

const FuncComp = () => {
  return (
    <div>函数组件forwordRef</div>
  )
}

const FuncCompRef = React.forwardRef(FuncComp)
console.log(FuncCompRef);

ReactDOM.render(<MyClassCom name='my-func-com' />, root);
console.log(<MyClassCom name='my-func-com' />);