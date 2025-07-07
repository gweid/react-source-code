import { allowConcurrentByDefault } from 'shared/ReactFeatureFlags'

/** 总车道数量 */
export const TotalLanes = 31

/** 无车道 */
export const NoLanes = /*                       */ 0b0000000000000000000000000000000
/** 无车道 */
export const NoLane = /*                        */ 0b0000000000000000000000000000000

/** 同步车道 */
export const SyncLane = /*                      */ 0b0000000000000000000000000000001

/** 输入连续水合车道 */
export const InputContinuousHydrationLane = /*  */ 0b0000000000000000000000000000010
/** 输入连续车道 */
export const InputContinuousLane = /*           */ 0b0000000000000000000000000000100

/** 默认水合车道 */
export const DefaultHydrationLane = /*          */ 0b0000000000000000000000000001000
/** 默认车道 */
export const DefaultLane = /*                   */ 0b0000000000000000000000000010000

/** 选择性水合车道 */
export const SelectiveHydrationLane = /*        */ 0b0001000000000000000000000000000

/** 空闲水合车道 */
export const IdleHydrationLane = /*             */ 0b0010000000000000000000000000000
/** 空闲车道 */
export const IdleLane = /*                      */ 0b0100000000000000000000000000000

/** 屏幕外车道 */
export const OffscreenLane = /*                 */ 0b1000000000000000000000000000000

/** 非空闲车道 */
const NonIdleLanes = /*                         */ 0b0001111111111111111111111111111


/**
 * 标记根节点更新
 * @param {*} root FiberRoot 节点
 * @param {*} updateLane 更新车道
 */
export const markRootUpdated = (root, updateLane) => {
  root.pendingLanes |= updateLane
}

/**
 * 获取下一个车道
 * @param {*} root FiberRoot 节点
 * @returns 下一个车道
 */
export const getNextLanes = (root) => {
  // createFiberRoot 中的 FiberRootNode 会创建 pendingLanes
  const pendingLanes = root.pendingLanes

  // 如果没有待处理的车道（相当于 FiberRoot 节点没有优先级的任务），则返回 NoLanes
  if (pendingLanes === NoLanes) return NoLanes

  const nextLanes = getHighestPriorityLanes(pendingLanes)

  return nextLanes
}

/**
 * 获取最高优先级车道
 * @param {*} lanes 车道
 * @returns 最高优先级车道
 */
export const getHighestPriorityLanes = (lanes) => {
  return getHighestPriorityLane(lanes)
}

/**
 * 获取最高优先级车道
 * @param {*} lanes 车道
 * @returns 最高优先级车道
 */
export const getHighestPriorityLane = (lanes) => {
  // 获取最低有效位（最高优先级车道）
  return lanes & -lanes
}

/**
 * 是否包括非空闲工作
 * @param {*} lanes 车道
 * @returns 如果包括非空闲工作则返回 true
 */
export const includesNonIdleWork = (lanes) => {
  return (lanes & NonIdleLanes) !== NoLanes
}

/**
 * 是否是车道的子集
 * @param {*} set 集合
 * @param {*} subset 子集
 * @returns 如果是子集则返回 true
 */
export const isSubsetOfLanes = (set, subset) => {
  return (set & subset) === subset
}

/**
 * 合并车道
 * @param {*} a 车道 a
 * @param {*} b 车道 b
 * @returns 合并后的车道
 */
export const mergeLanes = (a, b) => {
  return a | b
}

/**
 * 是否包括阻塞车道（在并发渲染中使用）
 * 
 * 若返回 true，React 会跳过时间切片（Time Slicing），直接执行 performSyncWorkOnRoot
 * 若返回 false，则进入并发渲染模式（performConcurrentWorkOnRoot），允许任务中断
 * @param {*} root FiberRoot 节点
 * @param {*} lanes 车道
 * @returns 
 */
export const includesBlockingLane = (root, lanes) => {
  if (allowConcurrentByDefault) return false

  const SyncDefaultLanes = InputContinuousLane | DefaultLane
  return (lanes & SyncDefaultLanes) !== NoLanes
}
