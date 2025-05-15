import isArray from 'shared/isArray'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { Placement } from './ReactFiberFlags'
import { createFiberFromElement, createFiberFromText } from './ReactFiber'

/**
 * 
 * @param {*} shouldTrackSideEffects 
 * @returns reconcileChildFibers 函数: 用于处理子fiber的函数
 */
const createChildReconciler = (shouldTrackSideEffects) => {

  /**
   * 将新的子虚拟 DOM 转换为 Fiber
   * @param {*} returnFiber 新的父 Fiber
   * @param {*} newChild 新的子虚拟 DOM
   * @returns 新的子 Fiber | null
   */
  const createChild = (returnFiber, newChild) => {
    // 虚拟 DOM 是文本节点
    if ((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
      const created = createFiberFromText(`${newChild}`)
      created.return = returnFiber
      return created
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          const created = createFiberFromElement(newChild)
          created.return = returnFiber
          return created
        default:
          break
      }
    }

    return null
  }

  /**
   * 为新创建的 Fiber 设置索引，表示同级节点中节点的位置索引，对应 Fiber 树的 index 属性
   * 并在必要时设置副作用(打标记)
   * 
   * @param {*} newFiber 新的 Fiber
   * @param {*} newIdx Fiber 的索引
   * @returns Fiber
   */
  const placeChild = (newFiber, newIdx) => {
    newFiber.index = newIdx

    if (shouldTrackSideEffects) {
      newFiber.flags |= Placement
    }

    return newFiber
  }

  /**
   * 为新创建的 Fiber 设置副作用(打标记)
   * @param {*} newFiber 新的 Fiber
   * @returns Fiber
   */
  const placeSingleChild = (newFiber) => {
    if (shouldTrackSideEffects) {
      newFiber.flags |= Placement
    }
    return newFiber
  }

  /**
   * 处理单个虚拟 DOM 转 Fiber
   * @param {*} returnFiber 新的父Fiber
   * @param {*} currentFirstFiber 老 Fiber 第一个子 Fiber 
   * @param {*} element 新的子虚拟 DOM
   * @returns 返回新创建的 Fiber
   */
  const reconcileSingleElement = (returnFiber, currentFirstFiber, element) => {
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  /**
   * 处理数组情况的虚拟 DOM 转 Fiber
   * @param {*} returnFiber 新的父 Fiber
   * @param {*} currentFirstFiber 老 Fiber 第一个子 Fiber 
   * @param {*} newChild 新的子虚拟 DOM
   * @returns 新的第一个子 Fiber
   */
  const reconcileChildrenArray = (returnFiber, currentFirstFiber, newChild) => {
    let resultingFirstChild = null
    let previousNewFiber = null

    let newIdx = 0
    for (; newIdx < newChild.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChild[newIdx])

      if (newFiber === null) continue

      // 为新创建的 Fiber 设置索引（标记同级节点中节点的位置索引），并在必要时设置副作用(打标记)
      placeChild(newFiber, newIdx)

      // 建立兄弟关系，形成链表
      // 注意：兄弟关系只记录下一个，不会记录上一个
      if (previousNewFiber ===  null) {
        resultingFirstChild = newFiber
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber
    }

    return resultingFirstChild
  }

  /**
   * 将新的子虚拟 DOM 转换为 Fiber
   * @param {*} returnFiber 新的父 Fiber
   * @param {*} currentFirstFiber 老 Fiber 第一个子 Fiber 
   * @param {*} newChild 新的子虚拟 DOM
   * @returns 新的子 Fiber | null
   */
  const reconcileChildFibers = (returnFiber, currentFirstFiber, newChild) => {
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          // 将新的子虚拟 DOM 转换为 Fiber 返回
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstFiber, newChild))
        default:
          break
      }
    }

    if (isArray(newChild)) {
      // 如果虚拟 DOM 是数组，那么将第一个虚拟 DOM 转换为 Fiber 返回
      return reconcileChildrenArray(returnFiber, currentFirstFiber, newChild)
    }

    return null
  }

  return reconcileChildFibers
}

// 初次挂载的时候
export const mountChildFibers = createChildReconciler(false)

// 更新的时候
export const reconcileChildFibers = createChildReconciler(true)
