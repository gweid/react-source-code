import { scheduleCallback } from 'scheduler'
import { createWorkInProgress } from './ReactFiber'
import { beginWork } from './ReactFiberBeginWork'
import { completeWork } from './ReactFiberCompleteWork'

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
  // 返回的 next 是 子 Fiber 节点
  const next = beginWork(current, unitOfWork)

  // 经过 beginWork 处理后，可以将 【待生效的 props】 赋值给 【当前生效的 props】
  unitOfWork.memoizedProps = unitOfWork.pendingProps

  // TODO：为了避免死循环，暂时将 workInProgress 先置为 null，后续需要删除
  workInProgress = null

  if (next === null) {
    // 没有子节点，说明已经处理完成，内部调用 completeWork 将虚拟 DOM 转化为真实 DOM
    // 找兄弟 Fiber，如果没有兄弟 Fiber，向上回溯到父节点（遵循深度优先算法）
    completeUnitOfWork(unitOfWork)
  } else {
    // 有子节点，说明还没有处理完成，向下进入子节点
    workInProgress = next
  }
}

/**
 * 将 Fiber 树转换为真实 DOM
 * @param {*} unitOfWork 当前正在处理的 Fiber 节点的引用​
 */
const completeUnitOfWork = (unitOfWork) => {
  let completedWork = unitOfWork

  // do...while：先执行一次循环体，再判断条件是否成立（至少执行一次）
  // while：先判断条件是否成立，再执行循环体（可能一次也不执行）
  do {
    // 拿到老 Fiber
    const current = completedWork.alternate
    // 拿到新 Fiber 的父节点
    const returnFiber = completedWork.return

    // 将 Fiber 转换为 真实 DOM
    completeWork(current, completedWork)

    const siblingFiber = completedWork.sibling
    if (siblingFiber !== null) {
      workInProgress = siblingFiber
      return
    }

    completedWork = returnFiber
    workInProgress = completedWork
  } while(completedWork !== null)
}

/**
 * commit 阶段，执行挂载
 * @param {*} root FiberRoot
 */
const commitRoot = (root) => {

}
