import isArray from 'shared/isArray'
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { Placement, ChildDeletion } from './ReactFiberFlags'
import { createFiberFromElement, createFiberFromText, createWorkInProgress } from './ReactFiber'
import { HostText } from './ReactWorkTags'

/**
 * 返回创建 Fiber 函数
 * @param {*} shouldTrackSideEffects 判断是初始挂载还是更新
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
   * @param {*} lastPlacedIndex 上一个可复用的不用改变位置的子 Fiber 在老 Fiber 中的索引位置（主要用来确定可复用的子 Fiber 是否需要移动）
   * @param {*} newIdx Fiber 的索引
   * @returns lastPlacedIndex 新的位置
   */
  const placeChild = (newFiber, lastPlacedIndex, newIndex) => {
    newFiber.index = newIndex

    // !shouldTrackSideEffects 代表是初始化阶段
    if (!shouldTrackSideEffects) {
      return lastPlacedIndex
    }

    // 老 Fiber
    const current = newFiber.alternate

    // current !== null，代表是可复用的节点
    if (current !== null) {
      // 获取老 Fiber 索引
      const oldIndex = current.index
      // 可复用节点，判断是否需要移动
      if (oldIndex < lastPlacedIndex) {
        newFiber.flags |= Placement
        return lastPlacedIndex
      } else {
        return oldIndex
      }
    } else {
      // current === null，代表不可复用节点
      newFiber.flags |= Placement
      return lastPlacedIndex
    }
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
   * 复用 type 相同的老 Fiber
   * @param {*} fiber 老 Fiber
   * @param {*} pendingProps props 属性
   * @returns 可复用的 Fiber
   */
  const useFiber = (fiber, pendingProps) => {
    const clone = createWorkInProgress(fiber, pendingProps)

    clone.index = 0
    clone.sibling = null // 单节点是没有兄弟节点的
    return clone
  }

  /**
   * 删除子 Fiber 及他后面的兄弟 Fiber（不是删除，是打上删除标记）
   * @param {*} returnFiber 父 Fiber
   * @param {*} currentFirstChild 子 Fiber
   */
  const deleteRemainingChildren = (returnFiber, currentFirstChild) => {
    // 初始化渲染，不需要打标记
    if (!shouldTrackSideEffects) return

    let childToDelete = currentFirstChild

    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

  /**
   * 删除老 Fiber（不是真的删除，是打个删除标记）
   * @param {*} returnFiber 父 Fiber
   * @param {*} childToDelete 子 Fiber
   */
  const deleteChild = (returnFiber, childToDelete) => {
    // 初始化渲染，不需要打标记
    if (!shouldTrackSideEffects) return

    const deletions = returnFiber.deletions

    // 将需要删除子 Fiber 放进 deletions 中，并且父 Fiber 中打上删除的 flags
    if (deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      returnFiber.deletions.push(childToDelete)
    }
  }

  /**
   * 处理初始化阶段单个虚拟 DOM 转 Fiber，更新阶段的 DOM Diff 比较
   * @param {*} returnFiber 新的父Fiber
   * @param {*} currentFirstChild 老 Fiber 第一个子 Fiber 
   * @param {*} element 新的子虚拟 DOM
   * @returns 返回新创建的 Fiber
   */
  const reconcileSingleElement = (returnFiber, currentFirstChild, element) => {
    const key = element.key
    let child = currentFirstChild

    // 更新阶段 DOM diff 逻辑
    while (child !== null) {
      // 如果 key 相同
      if (child.key === key) {
        // 如果 type 相同
        if (child.type === element.type) {
          // 先删除剩下的其它老 Fiber
          deleteRemainingChildren(returnFiber, child.sibling)

          // 复用 type 相同的老 Fiber
          const existing = useFiber(child, element.props)

          existing.return = returnFiber
          return existing
        } else {
          // 如果 type 不同，直接删除老 Fiber 及兄弟节点
          deleteRemainingChildren(returnFiber, child)
        }
      } else {
        // 如果 key 不同，直接删除老 Fiber，进入兄弟节点的 key 判断
        deleteChild(returnFiber, child)
      }

      child = child.sibling
    }

    // 初始化阶段逻辑
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  /**
   * 处理初始化阶段数组情况的虚拟 DOM 转 Fiber，更新阶段的 DOM Diff 比较
   * @param {*} returnFiber 新的父 Fiber
   * @param {*} currentFirstChild 老 Fiber 第一个子 Fiber 
   * @param {*} newChildren 新的子虚拟 DOM
   * @returns 新的第一个子 Fiber
   */
  const reconcileChildrenArray = (returnFiber, currentFirstChild, newChildren) => {
    let resultingFirstChild = null
    let previousNewFiber = null
    let newIdx = 0
    let oldFiber = currentFirstChild
    let nextOldFiber = null // 下一个老 Fiber 子节点
    let lastPlacedIndex  = 0 // 

    /**
     * 更新阶段 DOM diff 逻辑
     * 第一轮，线性同序比较
     * 
     * 共用 newIdx 的好处是，当是更新阶段，只会走更新阶段逻辑，不会再走到下面的初始化阶段
     */
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      nextOldFiber = oldFiber.sibling

      /**
       * 同序比较线性比较
       * 返回的 Fiber 有两种情况：
       *  1、key 相同，type 相同，可以复用的老 Fiber
       *  2、key 相同，type 不同，创建的新 Fiber
       */
      const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx])

      // newFiber === null 代表 key 不相同，直接退出线性同序比较
      if (newFiber === null) {
        break
      }

      if (shouldTrackSideEffects) {
        // newFiber.alternate === null 表示新 Fiber 没有复用老 Fiber
        // 这种情况：就是 key 相同，type 不同，所以生成了新的 Fiber，却没有复用；updateSlot 中做了操作
        // 那么删除老节点
        if (oldFiber && newFiber.alternate === null) {
          deleteChild(returnFiber, oldFiber)
        }
      }

      // lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)

      // 建立兄弟关系，形成链表
      // 注意：兄弟关系只记录下一个，不会记录上一个
      if (previousNewFiber === null) {
        // 第一个子 Fiber 记录在 resultingFirstChild 中，后面要返回
        resultingFirstChild = newFiber
      } else {
        previousNewFiber.sibling = newFiber
      }
      previousNewFiber = newFiber

      // 下一个 Fiber 节点比较
      oldFiber = nextOldFiber
    }

    /**
     * oldFiber 为空是两种情况：
     *  1、初始化阶段
     *  2、更新 DOM Diff 第一轮同序线性比较走完后，老 Fiber 也遍历完了
     */
    if (oldFiber === null) {      
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(returnFiber, newChildren[newIdx])
  
        if (newFiber === null) continue
  
        // 为新创建的 Fiber 设置索引（标记同级节点中节点的位置索引），并在必要时设置副作用(打标记)
        placeChild(newFiber, newIdx)
  
        // 建立兄弟关系，形成链表
        // 注意：兄弟关系只记录下一个，不会记录上一个
        if (previousNewFiber === null) {
          // 第一个子 Fiber 记录在 resultingFirstChild 中，后面要返回
          resultingFirstChild = newFiber
        } else {
          previousNewFiber.sibling = newFiber
        }
        previousNewFiber = newFiber
      }
    }

    // 更新逻辑：老 Fiber 和新虚拟 DOM 经过第一轮同序线性比较后，都没有遍历完
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber)

    // 遍历剩余的新虚拟 DOM
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx]
      )

      // 如果
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          // newFiber.alternate !== null 说明是可复用 Fiber
          if (newFiber.alternate !== null) {
            existingChildren.delete(newFiber.key === null ? newIdx : newFiber.key)
          }
        }

        // lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx)

        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    // 最后，将不可复用的老 Fiber 标记为删除
    if (shouldTrackSideEffects) {
      existingChildren.forEach(child => deleteChild(returnFiber, child))
    }

    return resultingFirstChild
  }

  /**
   * 找到未遍历完的老 Fiber 的子 Fiber 数组中可复用的节点
   * @param {*} existingChildren 未遍历完的老 Fiber 的子 Fiber 数组
   * @param {*} returnFiber 父节点
   * @param {*} newIdx 位置 index
   * @param {*} newChild 新的子虚拟 DOM
   * @returns 可复用的 Fiber
   */
  const updateFromMap = (existingChildren, returnFiber, newIdx, newChild) => {
    // 如果是文本节点
    if ((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
      // 文本节点没有 key
      const matchedFiber = existingChildren.get(newIdx) || null
      // `${newChild}` 将 number 类型也统一转换为字符串类型
      return updateTextNode(returnFiber, matchedFiber, `${newChild}`)
    }

    // 如果是标签元素
    if (newChild && typeof newChild === 'object') {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          const matchedFiber = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null
          return updateElement(returnFiber, matchedFiber, newChild)
        default:
          return null
      }
    }

    return null
  }

  /**
   * 多节点 DOM Diff 第一轮线性同序比较核心函数：
   *  1、比较 key 是否先等，不相等，直接返回 null
   *  2、key 相等，比较 type 是否相等
   *    2.1、不相等，创建新 Fiber，删除老 Fiber
   *    2.2、相等，复用老 Fiber，更新属性
   * @param {*} returnFiber 父 Fiber
   * @param {*} oldFiber 老的子 Fiber
   * @param {*} newChild 新的子虚拟 DOM
   * @returns 可复用的 Fiber
   */
  const updateSlot = (returnFiber, oldFiber, newChild) => {
    const key = oldFiber !== null ? oldFiber.key : null

    // 对文本节点的处理
    if ((typeof newChild === 'string' && newChild !== '') || typeof newChild === 'number') {
      // 文本节点没有 key，所以如果 Fiber 有 key，那么就不是文本节点，不可复用
      if (key !== null) {
        return null
      }
      // `${newChild}` 将 number 类型也统一转换为字符串类型
      return updateTextNode(returnFiber, oldFiber, `${newChild}`)
    }

    if (newChild !== null && typeof newChild === 'object') {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (newChild.key === key) {
            return updateElement(returnFiber, oldFiber, newChild)
          }
          break
        default:
          return null
      }
    }

    return null
  }

  /**
   * 将剩余旧节点存入 `Map`，遍历剩余新节点，通过 `key` 查找可复用节点 这个过程对文本节点的处理
   * @param {*} returnFiber 父 Fiber
   * @param {*} current 当前的 Fiber
   * @param {*} textContent 文本内容
   * @returns 
   */
  const updateTextNode = (returnFiber, current, textContent) => {
    /**
     * 两种情况需要新建 Fiber 节点：
     *  1、current === null 说明 existingChildren 中没找到可复用的子节点
     *  2、current.tag !== HostText 说明 existingChildren 中找到的可复用节点不是文本节点，但新虚拟 DOM 是文本节点
     */
    if (current === null || current.tag !== HostText) {
      const created = createFiberFromText(textContent)
      created.return = returnFiber
      return created
    } else {
      // 是可复用节点
      const existing = useFiber(current, textContent)
      existing.return = returnFiber
      return existing
    }
  }

  /**
   * 判断 type 是否相同，进行 Fiber 复用
   * @param {*} returnFiber 父 Fiber
   * @param {*} current 老的子 Fiber
   * @param {*} element 新的子虚拟 DOM
   * @returns 可复用的 Fiber
   */
  const updateElement = (returnFiber, current, element) => {
    const elementType = element.type

    // 如果 type 
    if (current !== null) {
      if (current.type === elementType) {
        const existing = useFiber(current, element.props)
        existing.return = returnFiber
        return existing
      }
    }

    // 如果 type 不同，创建新 Fiber
    const created = createFiberFromElement(element)
    created.return = returnFiber
    return created
  }

  /**
   * 将没有被遍历完的老 Fiber 的子 Fiber 存储在 Map 结构中
   * @param {*} returnFiber 父节点
   * @param {*} currentFirstChild 当前的子 Fiber
   * @returns 没有被遍历完的老 Fiber 的子 Fiber 数组
   */
  const mapRemainingChildren = (returnFiber, currentFirstChild) => {
    // 用 Map 存储没有被遍历完的老 Fiber 的子 Fiber
    const existingChildren = new Map()

    let existingChild = currentFirstChild

    while (existingChild!== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild)
      } else {
        existingChildren.set(existingChild.index, existingChild)
      }

      existingChild = existingChild.sibling
    }

    return existingChildren
  }

  /**
   * 将新的子虚拟 DOM 转换为 Fiber
   * @param {*} returnFiber 新的父 Fiber
   * @param {*} currentFirstChild 老 Fiber 第一个子 Fiber 
   * @param {*} newChild 新的子虚拟 DOM
   * @returns 新的子 Fiber | null
   */
  const reconcileChildFibers = (returnFiber, currentFirstChild, newChild) => {
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          // 将新的子虚拟 DOM 转换为 Fiber 返回
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFirstChild, newChild))
        default:
          break
      }
    }

    if (isArray(newChild)) {
      // 如果虚拟 DOM 是数组，那么将第一个虚拟 DOM 转换为 Fiber 返回
      return reconcileChildrenArray(returnFiber, currentFirstChild, newChild)
    }

    return null
  }

  return reconcileChildFibers
}

// 初次挂载的时候
export const mountChildFibers = createChildReconciler(false)

// 更新的时候
export const reconcileChildFibers = createChildReconciler(true)
