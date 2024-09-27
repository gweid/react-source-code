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

// ReactDOM.render(<div key="once" ref="divBox" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>, root);

const MyFuncCom = (props) => {
  return (
    <div key="once" ref="divBox" style={{color: '#333' }}><div><span style={{color: 'red', fontSize: '20px' }}>哈哈哈</span>子节点</div>react demo</div>
  )
}

ReactDOM.render(<MyFuncCom name='my-func-com' />, root);
 
console.log(<MyFuncCom name='my-func-com' />);