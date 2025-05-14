import { scheduleCallback } from 'scheduler'
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'

let workInProgress = null

/**
 * 调度更新入口
 * @param {*} root FiberRoot
 */
export const schedulerUpdateOnFiber = (root) => {
  ensureRootIsScheduled(root)
}

/**
 * 通过 bind 绑定 root 参数，确保即使异步调度，也能访问到正确的 root
 * @param {*} root FiberRoot
 */
const ensureRootIsScheduled = (root) => {
  // 这里使用 bind，会创建一个闭包，保护 root 参数，null 表示不绑定 this 上下文
  // 确保即使在异步调度执行时，也能访问到正确的 root，防止在并发环境下参数丢失问题
  scheduleCallback(performConcurrentWorkOnRoot.bind(null, root))
}

/**
 * 并发渲染的核心函数，调度执行具体的渲染工作
 * @param {*} root FiberRoot
 */
const performConcurrentWorkOnRoot = (root) => {
  // 同步渲染，这并不是渲染到页面，而是对 Fiber 树进行一系列的构建和操作
  renderRootSync(root)

  // 渲染后的 workInProgress 树
  const finishedWork = root.current.alternate
  root.finishedWork = finishedWork

  // commit 阶段（挂载）
  commitRoot(root)
}

/**
 * 同步对 Fiber 树进行一系列的构建和操作
 * @param {*} root FiberRoot
 */
const renderRootSync = (root) => {
  prepareFreshStack(root)
  workLoopSync()
}

/**
 * 创建正在工作中的 Fiber 树：workInProgress（双缓存）
 * @param {*} root 
 */
const prepareFreshStack = (root) => {
  workInProgress = createWorkInProgress(root.current, null)
}

/**
 * 同步循环处理 Fiber 树
 * 深度优先遍历，从根节点开始，依次处理每个 Fiber 节点，直到没有未处理的节点（workInProgress === null）
 * workInProgress：表示​当前正在处理的 Fiber 节点的引用​
 */
const workLoopSync = () => {
  while(workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

/**
 * 处理单个 Fiber 节点的核心函数
 * @param {*} unitOfWork ​当前正在处理的 Fiber 节点的引用​
 */
const performUnitOfWork = (unitOfWork) => {
  // current 是当前屏幕上显示的 Fiber 树（对应真实 DOM），unitOfWork 是新的正在工作的 Fiber 树
  const current = unitOfWork.alternate
  const next = beginWork(current, unitOfWork)

  // 经过 beginWork 处理后，可以将 【待生效的 props】 赋值给 【当前生效的 props】
  unitOfWork.memoizedProps = unitOfWork.pendingProps

  // TODO：为了避免死循环，暂时将 workInProgress 置为 null，后续需要删除
  // workInProgress = null

  if (next === null) {
    // 没有子节点，说明已经处理完成，向上回溯到父节点
    completeUnitOfWork(unitOfWork)
  } else {
    // 有子节点，说明还没有处理完成，向下进入子节点
    workInProgress = next
  }
}

/**
 * 没有需要处理的子节点，向上回溯到父节点
 * @param {*} unitOfWork 当前正在处理的 Fiber 节点的引用​
 */
const completeUnitOfWork = (unitOfWork) => {

}

/**
 * commit 阶段，执行挂载
 * @param {*} root FiberRoot
 */
const commitRoot = (root) => {

}
