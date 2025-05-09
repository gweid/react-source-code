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
// ReactDOM.render(<div>react demo</div>, root);

// 手动实现的 react
// const root = document.getElementById('root');
// ReactDOM.render(
//  <div style={{ color: 'red' }}>react demo<span>span标签</span></div>,
// root);


const root = document.getElementById('root');


// ----------------------- 普通标签 -----------------------
// ReactDOM.render(<div key="once" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>, root);
// console.log(<div key="once" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>);



// ----------------------- 函数组件 -----------------------
// const MyFuncCom = (props) => {
//   return (
//     <div
//       key="once"
//       style={{color: '#333' }}
//     >
//       <div>
//         <span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>
//         子节点
//       </div>
//       react demo
//     </div>
//   )
// };

// ReactDOM.render(<MyFuncCom name='my-func-com' />, root);
// console.log(<MyFuncCom name='my-func-com' />);



// ----------------------- 类组件 -----------------------
// class MyClassCom extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       age: 18
//     }
//   }

//   render() {
//     return (
//       <div key="once" style={{color: '#333' }}>
//         <div>
//           <span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>
//           子节点
//         </div>
//         <div>年龄：{this.state.age}</div>
//       </div>
//     )
//   }
// };
 
// ReactDOM.render(<MyClassCom name='my-class-com' />, root);



// ----------------------- 事件 -----------------------
// class MyClassCom extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       count: 0,
//     }
//   }

//   handleParentClick() {
//     console.log('点击冒泡到父元素');
//   }

//   handleClick(e) {
//     // 阻止冒泡
//     e.stopPropagation()

//     this.setState({
//       count: this.state.count + 1
//     })
//   }

//   render() {
//     return (
//       <div>
//         <div>计数器：{this.state.count}</div>
//         <div onClick={this.handleParentClick}>
//           <button onClick={(e) => this.handleClick(e)}>点击事件，计数器++</button>
//         </div>
//       </div>
//     )
//   }
// };

// ReactDOM.render(<MyClassCom name='my-func-com' />, root);



// ----------------------- ref -----------------------
// class MyClassCom extends React.Component {
//   constructor(props) {
//     super(props)

//     this.divRef = React.createRef()
//     this.classCompRef = React.createRef()
//     this.funcCompRef = React.createRef()
//   }

//   handleDivRefClick() {
//     console.log(this.divRef.current.innerText)
//   }

//   handleRefClick() {
//     this.classCompRef.current.handleAdd(10)
//     console.log(this.funcCompRef.current)
//   }

//   render() {
//     return (
//       <div>
//         <h1>------- ref -------</h1>
//         <div ref={this.divRef} onClick={() => this.handleDivRefClick()}>普通标签ref</div>

//         <button onClick={() => this.handleRefClick()}>组件的ref</button>
//         <RefComp ref={this.classCompRef} />
//         <FuncCompRef ref={this.funcCompRef} />
//       </div>
//     )
//   }
// };

// class RefComp extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       num: 0
//     }
//   }

//   handleAdd(num) {
//     this.setState({
//       num: this.state.num + num
//     })
//   }

//   render() {
//     return (
//       <div>
//         <p>数值：{this.state.num}</p>
//         <button onClick={() => this.handleAdd(1)}>+1</button>
//       </div>
//     )
//   }
// }

// const FuncComp = (props, ref) => {
//   console.log('函数组件的', ref);

//   const handleLogger = () => {
//     console.log('函数组件的ref触发了');
//   }

//   return (
//     <div ref={ref} onClick={handleLogger}>函数组件forwordRef</div>
//   )
// }

// const FuncCompRef = React.forwardRef(FuncComp)

// ReactDOM.render(<MyClassCom name='my-func-com' />, root);



// ----------------------- dom diff -----------------------
// class MyClassCom extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       list: ['A', 'B', 'C', 'D', 'E']
//     }
//   }

//   handleDiff() {
//     this.setState({
//       list: ['C', 'B', 'E', 'F', 'A']
//     })
//   }

//   render() {
//     return (
//       <div>
//         <div>
//           {
//             this.state.list.map(item => (
//               <div key={item}>{item}</div>
//             ))
//           }
//         </div>
//         <button onClick={() => this.handleDiff()}>diff更新</button>
//       </div>
//     )
//   }
// };

// ReactDOM.render(<MyClassCom name='my-func-com' />, root);


// ----------------------- 生命周期 -----------------------
// class MyClassCom extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       num: 100,
//     }
//   }

//   componentDidMount() {
//     console.log('componentDidMount');
//   }

//   shouldComponentUpdate() {
//     console.log('shouldComponentUpdate');
//     return true
//   }

//   componentDidUpdate() {
//     console.log('componentDidUpdate');
//   }

//   componentWillUnmount() {
//     console.log('componentWillUnmount');
//   }

//   handleUpdate() {
//     this.setState({ num: 200 })
//   }

//   render() {
//     console.log('render')

//     const { num } = this.state

//     return (
//       <div>
//         <h3>生命周期</h3>
//         <div>{num}</div>
//         <button onClick={() => this.handleUpdate()}>更新</button>
//       </div>
//     )
//   }
// };

// ReactDOM.render(<MyClassCom />, root);


// ----------------------- 生命周期(getDerivedStateFromProps) -----------------------
// class SonCom extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       name: '张三'
//     }
//   }

//   static getDerivedStateFromProps(nextProps, prevState) {
//     if (nextProps.userName !== prevState.name) {
//       return {
//         name: nextProps.userName
//       }
//     }
//   }

//   render() {
//     return (
//       <div>
//         <div>用户名: {this.state.name}</div>
//       </div>
//     )
//   }
// }

// class ParentCom extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       userName: ''
//     }
//   }

//   handleClick() {
//     this.setState({
//       userName: '李四'
//     })
//   }

//   render() {
//     return (
//       <div>
//         <SonCom userName={this.state.userName} />
//         <button onClick={() => this.handleClick()}>点击改变</button>
//       </div>
//     )
//   }
// }

// ReactDOM.render(<ParentCom />, root);


// ----------------------- 生命周期(getSnapshotBeforeUpdate) -----------------------
// class ScrollList extends React.Component {
//   constructor(props) {
//     super(props)

//     this.state = {
//       dataList: []
//     }

//     this.listRef = React.createRef();
//   }

//   addItem = () => {
//     const { dataList } = this.state;
//     const newItem = {
//       id: dataList.length + 1,
//       text: `Item ${dataList.length + 1}`
//     };

//     this.setState({
//       dataList: [...dataList, newItem]
//     });
//   }

//   getSnapshotBeforeUpdate(prevProps, prevState) {
//     console.log('getSnapshotBeforeUpdate')

//     if (prevState.dataList.length < this.state.dataList.length) {
//       return this.listRef.current.scrollHeight;
//     }
//     return null;
//   }

//   componentDidUpdate(prevProps, prevState, snapshot) {
//     if (snapshot !== null) {
//       this.listRef.current.scrollTop += this.listRef.current.scrollHeight - snapshot;
//     }
//   }

//   render() {
//     const { dataList } = this.state

//     console.log('render');

//     return (
//       <div>
//         <button onClick={this.addItem}>添加项目</button>
//         <div
//           ref={this.listRef}
//           style={{
//             overflowY: 'scroll',
//             width: '100px',
//             height: '150px',
//             border: '1px solid #ccc'
//           }}
//         >
//           {dataList.map(item => (
//             <div key={item.id}>{item.text}</div>
//           ))}
//         </div>
//       </div>
//     );
//   }
// }

// ReactDOM.render(<ScrollList />, root);


// ----------------------- PureComponent -----------------------
class SonCom extends React.PureComponent {

  render() {
    console.log('son render');

    return (
      <div>
        <div>{this.props.name}</div>
      </div>
    )
  }
}

class ParentCom extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      num: 0,
      name: '张三'
    }
  }

  handleAdd = () => {
    this.setState({
      num: this.state.num + 1
    })
  }

  handleName = () => {
    this.setState({
      name: '李四'
    })
  }

  render() {
    return (
      <div>
        <div>
          <div>{this.state.num}</div>
          <button onClick={this.handleAdd}>数字增加</button>
        </div>
        <div>
          <SonCom name={this.state.name} />
          <button onClick={this.handleName}>改变名字</button>
        </div>
      </div>
    )
  }
};

ReactDOM.render(<ParentCom />, root);
