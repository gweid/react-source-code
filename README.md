# react 源码相关

>与最开始 react 16 版本相比，react 18 有了很多变化，为了深入了解，所以打算阅读 react 18 源码，本文为阅读源码及手动实现 mini-react 的一些相关记录
>
>
>
>基于 react@18+ 版本



可以结合资料：

- [图解React](https://7km.top/)




## 源码阅读篇

[react 源码阅读](./react-source-debug/README.md)



## 手写 react 篇



### React 核心

- React 核心原理
- React 事件与状态管理
- React 架构



#### React 核心原理

无论 React 怎么变化，总有一些东西是不会怎么变的：

- 组件生命周期
- 虚拟 DOM 的实现
- Diff 算法
- 组件渲染与更新
- Hooks 机制



#### React 事件与状态管理

主要是与用户交互相关的：

- 事件代理机制
- 自定义事件系统
- steState 工作原理
- 状态更新处理
- props 与 state



#### React 架构

这是 react 18 最重要的部分，相当于核心原理的具体实现；具体原理是不变的，具体实现是会变的：

- Fiber 系统
- Concurrent 模式
- Lane 模型
- 调度系统
- 时间切片



### 手写 react



#### 实现简单版 react

[实现原始版的 react 代码](./simple-mini-react/README.md)，包括：

- 初始渲染
- 合成事件
- 类组件与函数组件
- DOM Diff 算法
- 类组件生命周期
- 性能优化部分
- Hooks



#### 实现 react18 核心代码

[实现 react 18 版本核心代码](./simple-react18/README.md)，包括：

- 初始渲染
  - jsxDEV
  - createRoot
  - render 函数
  - beginWork
  - completeWork
  - commitWork
- 合成事件
- 组件更新
- Hooks
- Lane 模型与优先级
- 调度系统
- 并发渲染

