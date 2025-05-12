# 手写 react18 核心代码



## 目录结构

```
react18-core/
  ├── packages                          // 子包目录
  │   ├── react                         // react 核心包
  │   ├── react-dom                     // react-dom 核心包
  │   ├── react-reconciler              // react 协调器
  │   ├── scheduler                     // 调度器
  │   ├── react-dom-bindings            // react-dom 绑定
  │   ├── shared                        // 公共代码
  │   └── index.jsx
```



## 实现 React 18 版本



### fiber 架构的设计理念

#### fiber

fiber 架构之前，react 基于堆栈的递归调和算法（dom diff），这种算法在进行虚拟 DOM 比较的时候，可能会阻塞页面主线程，导致页面渲染以及用户体验差。为了解决这个问题，引入了 fiber 架构。

fiber 架构是 react 为解决性能问题和提升调度能力而引入的一种新的内部实现机制。它主要通过重新组织渲染过程，将渲染工作分解为更小的任务单元，并允许这些任务在必要时被中断和恢复，从而优化了 React 的更新机制。

Fiber 通过任务分片、优先级调度和可中断渲染，使 React 能够高效处理复杂应用场景。



fiber 是一种数据结构，通过 ​​child​​、​​sibling​​ 和 ​​return​​ 指针构成单链表树形结构：
- child​​：指向第一个子节点
- sibling​​：指向下一个兄弟节点
- return​​：指向父节点（用于回溯）



**fiber 树关键属性如下**：

```js
{
  type: 'div' | FunctionComponent, // 节点类型（DOM 标签或组件）
  key: string | null,              // 唯一标识（用于 Diff 算法）
  stateNode: DOM节点或组件实例,     // 关联的真实 DOM 或组件实例

  child: Fiber | null,             // 第一个子节点
  sibling: Fiber | null,           // 下一个兄弟节点
  return: Fiber | null,            // 父节点

  alternate: Fiber | null,         // 指向另一棵树中的对应节点（双缓存）
  effectTag: number,               // 标记更新类型（如插入、删除）
  memoizedState: any,              // 当前状态（如 Hooks 链表）
  pendingProps: any,              // 待处理的 props
  memoizedProps: any,             // 当前生效的 props
  updateQueue: UpdateQueue,        // 状态更新队列
  lanes: number,                   // 调度优先级
}
```



**核心特性**：

- **增量渲染​**​：Fiber 将渲染过程拆分为多个小任务（称为“时间分片”），避免长时间阻塞主线程。这使得 React 可以优先处理高优先级任务（如用户输入），而低优先级任务（如数据加载）可以稍后执行。
- **可中断与恢复​​**：Fiber 的渲染过程可以被中断，并在浏览器空闲时恢复执行。这是通过链表结构的 Fiber 树实现的，每个 Fiber 节点保存了组件的状态和指向子节点、兄弟节点的指针。
- **优先级调度​**​：Fiber 根据任务的优先级动态调度更新。例如：
  - 用户交互（如点击、输入）是高优先级任务。
  - 后台数据更新是低优先级任务。
- **​双缓存机制**：​​React 维护两棵 Fiber 树：
  - current：当前屏幕上显示的 UI。
  - workInProgress：正在构建的新 UI 树。当 workInProgress 构建完成后，会原子性地替换 current 树，确保 UI 的一致性。
- **错误边界与并发模式​**​：Fiber 支持更健壮的错误处理（如 ErrorBoundary），并奠定了 React 并发模式（Concurrent Mode）的基础，允许同时处理多个更新



有了 fiber 之后：虚拟 DOM 树 -->  Fiber 树 --> 真实 DOM --> 挂载



#### fiber 双缓存策略

React Fiber 的双缓存策略是一种优化渲染性能的核心机制，通过维护两棵 Fiber 树（current 和 workInProgress）实现无缝的 UI 更新：
- current：当前屏幕上显示的 UI，每个 Fiber 节点通过 stateNode 关联真实 DOM
- workInProgress：正在构建的新 UI 树，两棵树通过 alternate 属性互相引用。当 workInProgress 构建完成后，会原子性地替换 current，确保 UI 的一致性



双缓存策略通过内存计算和原子替换，实现了高效、流畅的 UI 更新，是 React 高性能渲染的基石



#### 工作循环

react 内部处理更新和渲染任务的主要过程：
- **​​Reconciliation（协调阶段）**：遍历组件树，生成 Fiber 节点并比较新旧虚拟 DOM（Diff 算法），此阶段可中断，任务分片执行，优先级划分
- **​Commit（提交阶段）**：将协调阶段计算的变更**一次性**提交到真实 DOM，此阶段**不可中断**，确保 UI 更新的一致性



#### 并发模式

fiber 的并发模式通过任务分片和优先级调度，允许高优先级任务（如用户交互）中断低优先级任务（如数据加载）：
- **任务分片​**​：通过 requestIdleCallback 或 requestAnimationFrame 将任务拆分为小单元，避免阻塞主线程
- **​优先级划分**​​：
  - 高优先级（如用户交互）可中断低优先级任务（如数据加载）
  - 调度器（Scheduler）管理任务队列，动态调整执行顺序



### 初始化渲染

- 实现 jsxDEV
  - jsxDEV 作用：创建虚拟 DOM
- 实现 createRoot
- render 函数阶段划分
- 实现 beginWork、completeWork、commitWork



### 合成事件系统



### 组件更新



### 实现 Hooks



### Lane 模型与优先级



### 调度系统



### 并发渲染

