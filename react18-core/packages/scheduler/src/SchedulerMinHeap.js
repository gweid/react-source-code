/**
 * 将节点推入堆中
 * @param {*} heap - 堆
 * @param {*} node - 要推入的节点
 */
export const push = (heap, node) => {
  const index = heap.length
  // 将节点推入堆末尾
  heap.push(node)
  // 通过 siftUp 操作向上移动到正确的位置
  siftUp(heap, node, index)
}

/**
 * 获取堆顶元素
 * @param {*} heap - 堆
 * @returns 堆顶元素
 */
export const peek = (heap) => {
  return heap.length === 0 ? null : heap[0]
}

/**
 * 移除堆顶元素
 * @param {*} heap - 堆
 * @returns 移除的元素
 */
export const pop = (heap) => {
  if (heap.length === 0) return null

  const first = heap[0] // 堆顶元素
  const last = heap.pop() // 最后一个元素

  if (last !== first) {
    // 将最后一个元素移动覆盖堆顶元素，并通过 siftDown 操作向下调整位置
    heap[0] = last
    siftDown(heap, last, 0)
  }

  return first
}

/**
 * 向上调整堆
 * @param {*} heap - 堆
 * @param {*} node - 要调整的节点
 * @param {*} i - 要调整的节点索引
 */
const siftUp = (heap, node, i) => {
  let index = i

  while (index > 0) {
    /**
     * >>>：右移后，左侧始终用 0 填充   >>：右移后，左侧用符号位填充（正数填充 0，负数填充 1）
     * 也就是 >>> 相当于 Math.floor(num / 2)
     * 如果当前 index = 2，(2 - 1) >>> 1 即： 1 >>> 1 = 0
     * 如果当前 index = 4，(4 - 1) >>> 1 即： 3 >>> 1 = 1
     * 如果当前 index = 7，(7 - 1) >>> 1 即： 6 >>> 1 = 3
     */
    const parentIndex = (index - 1) >>> 1

    const parent = heap[parentIndex]

    if (compare(parent, node) > 0) {
      // 如果父节点大于当前节点，则交换位置
      heap[parentIndex] = node
      heap[index] = parent
      index = parentIndex
    } else {
      // 如果父节点小于当前节点，则停止调整
      return
    }
  }
}

/**
 * 向下调整堆
 * @param {*} heap - 堆
 * @param {*} node - 要调整的节点
 * @param {*} i - 要调整的节点索引
 */
const siftDown = (heap, node, i) => {
  let index = i
  const length = heap.length

  // length >>> 1 相当于 Math.floor(length / 2)
  // 一半长度
  const halfLength = length >>> 1

  /**
   * 为什么这里可以 index < 一半长度
   * 这是二叉树的特性：大于一半长度，是不会再有子节点的
   * 
   * [1, 2, 3, 4, 5, 6]：很明显，这里只有到 3 才有子节点
   * 
   * 0        1
   *        /   \
   * 1     2     3
   *      / \   /
   * 2   4   5 6
   */
  while (index < halfLength) {
    const leftIndex = (index * 2) + 1
    const rightIndex = leftIndex + 1

    const left = heap[leftIndex]
    const right = heap[rightIndex]

    // 如果左子节点小于当前节点
    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        // 如果右子节点小于左子节点，则：将右子节点与当前节点交换位置
        // [5, 3, 2] 经过 siftDown 后，[2, 3, 5]
        heap[index] = right
        heap[rightIndex] = node
        index = rightIndex
      } else {
        // 如果右子节点大于左子节点，则：将左子节点与当前节点交换位置
        // [5, 2, 3] 经过 siftDown 后，[2, 5, 3]
        heap[index] = left
        heap[leftIndex] = node
        index = leftIndex
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      // 如果右子节点小于当前节点，则：将右子节点与当前节点交换位置
      heap[index] = right
      heap[rightIndex] = node
      index = rightIndex
    } else {
      return
    }
  }
}


/**
 * 比较两个节点（react 中的节点就是对象）
 * @param {*} a - 第一个节点
 * @param {*} b - 第二个节点
 * @returns {*} 比较结果，如果 a 小于 b，则返回小于 0 的数，如果 a 等于 b，则返回 0，如果 a 大于 b，则返回大于 0 的数
 */
const compare = (a, b) => {
  // sortIndex 是任务的过期时间，即任务优先级，在 scheduleCallback 调度函数中定义
  const diff = a.sortIndex - b.sortIndex

  // 如果 diff （任务优先级）一样，那就按照创建顺序进行比较
  return diff !== 0 ? diff : a.id - b.id
}
