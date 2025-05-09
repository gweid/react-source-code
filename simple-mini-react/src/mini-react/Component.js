import { findDOMByVNode, updateDomTree } from './react-dom'
import { deepClone, shallowCompare } from './utils'

export const updateQueue = {
  isBatch: false, // 是否进行批量更新
  updater: new Set() // 保存更新 Updater 类
}

/**
 * 用来管理批量更新的
 *  执行 updateQueue 批量更新，后清洗
 *  执行时机：触发事件的时候
 */
export const flushUpdateQueue = () => {
  // 将批量更新开关置为 false
  updateQueue.isBatch = false

  // 遍历执行批量更新
  for(let updater of updateQueue.updater) {
    updater.launchUpdate()
  }

  // 清空更新
  updateQueue.updater.clear()
}

class Updater {
  constructor(ClassComInstance) {
    this.ClassComInstance = ClassComInstance

    // setState 可能执行多次，需要保存执行多次后的 state，一次更新
    this.pendingState = []
  }

  addState(partialState) {
    this.pendingState.push(partialState)

    this.preHandleForUpdate()
  }

  preHandleForUpdate() {
    if (updateQueue.isBatch) { 
      // 如果是批量更新，那么需要将 Updater 这个类保存起来，等待批量更新
      // 批量更新的时机：触发事件的时候，执行 flushUpdateQueue 函数，会遍历执行更新
      updateQueue.updater.add(this)
    } else {
      // 不是批量更新，直接执行更新
      this.launchUpdate()
    } 
  }

  // 合并 state 操作
  // 当父组件更新影响子组件更新，才会有 nextProps 参数
  launchUpdate(nextProps) {
    const { ClassComInstance, pendingState } = this
    if (pendingState.length === 0 && !nextProps) return

    let isShouldUpdate = true

    const preProps = deepClone(ClassComInstance.props)
    const preState = deepClone(ClassComInstance.state)

    // 合并 state
    const nextState = pendingState.reduce((preState, newState) => {
      return { ...preState, ...newState }
    }, ClassComInstance.state)

    debugger
 
    // 清空 pendingState
    pendingState.length = 0

    // 如果 shouldComponentUpdate 这个生命周期返回 false，那么不需要更新
    if (ClassComInstance.shouldComponentUpdate && !ClassComInstance.shouldComponentUpdate(nextProps, nextState)) {
      isShouldUpdate = false
    }

    ClassComInstance.state = nextState
    nextProps && (ClassComInstance.props = nextProps)

    // 执行更新
    isShouldUpdate && ClassComInstance.update(preProps, preState)
  }
}

export class Component {
  static IS_CLASS_COMPONENT = true // 标记为类组件

  constructor(props) {
    this.updater = new Updater(this)
    this.props = props
    this.state = {}
  }

  setState(partialState) {
    // 1、合并属性 
    // this.state = { ...this.state, ...partialState }
    // 使用另外一个类来管理 update
    this.updater.addState(partialState)

    // 2、重新渲染，进行更新
    // this.update()
  }

  update(preProps, preState) {
    // 1、重新执行 render 函数，获取到新的虚拟 DOM
    //    1.1、比较新旧虚拟 DOM
    // 2、根据新的虚拟 DOM 生成真实 DOM
    // 3、将真实 DOM 挂载到页面上

    // oldVNode 在 react-dom 中处理类组件的时候会挂载
    const oldVNode = this.oldVNode
    const oldDOM = findDOMByVNode(oldVNode)

    // getDerivedStateFromProps 生命周期钩子
    // 使用 this.constructor 是因为 getDerivedStateFromProps 是静态方法：static getDerivedStateFromProps
    if (this.constructor.getDerivedStateFromProps) {
      const newState = this.constructor.getDerivedStateFromProps(this.props, this.state) || {}
      this.state = {...this.state, ...newState}
    }

    // 获取新的虚拟 DOM
    const newVNode = this.render()

    // getSnapshotBeforeUpdate 生命周期钩子（在 render 之后，DOM 更新之前）
    const snapshot = this.getSnapshotBeforeUpdate && this.getSnapshotBeforeUpdate(preProps, preState)

    // 更新 DOM 树
    updateDomTree(oldVNode, newVNode, oldDOM)

    this.oldVNode = newVNode

    // componentDidUpdate 生命周期钩子
    if (this.componentDidUpdate) {
      this.componentDidUpdate(this.props, this.state, snapshot)
    }
  }
}

export class PureComponent extends Component {
  shouldComponentUpdate(nextProps, nextState) {
    return !shallowCompare(this.props, nextProps) || !shallowCompare(this.state, nextState)
  }
}
