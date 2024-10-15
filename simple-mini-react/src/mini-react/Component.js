import { findDOMByVNode, updateDomTree } from './react-dom'

export const updateQueue = {
  isBatch: false, // 是否进行批量更新
  updater: new Set() // 保存更新 Updater 类
}

/**
 * 用来管理批量更新的
 *  执行 updateQueue 批量更新，后清洗
 *  执行时机：
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
      // 如果是批量更新，那么需要将 Updater 这个类保存起来
      updateQueue.updater.add(this)
    } else {
      this.launchUpdate()
    }
  }

  // 合并 state 操作
  launchUpdate() {
    const { ClassComInstance, pendingState } = this
    if (pendingState.length === 0) return

    // 合并 state
    ClassComInstance.state = pendingState.reduce((preState, newState) => {
      return { ...preState, ...newState }
    }, ClassComInstance.state)

    // 清空 pendingState
    pendingState.length = 0

    // 执行更新
    ClassComInstance.update()
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

  update() {
    // 1、重新执行 render 函数，获取到新的虚拟 DOM
    //   1.1、比较新旧虚拟 DOM
    // 2、根据新的虚拟 DOM 生成真实 DOM
    // 3、将真实 DOM 挂载到页面上

    const oldVNode = this.oldVNode
    const oldDOM = findDOMByVNode(oldVNode)

    const newVNode = this.render()
    updateDomTree(oldDOM, newVNode) // 更新 DOM 树

    this.oldVNode = newVNode
  }
}
