import {
  DefaultLane,
  IdleLane,
  InputContinuousLane,
  SyncLane,
  getHighestPriorityLane,
  includesNonIdleWork
} from './ReactFiberLane'

/** 离散事件优先级（比如点击事件，一瞬间触发的事件），与 SyncLane 相关联，优先级最高 */
export const DiscreteEventPriority = SyncLane
/** 连续事件优先级（比如拖拽事件，会连续触发），与 InputContinuousLane 相关联 */
export const ContinuousEventPriority = InputContinuousLane
/** 默认事件优先级，与 DefaultLane 相关联 */
export const DefaultEventPriority = DefaultLane
/** 空闲事件优先级，与 IdleLane 相关联 */
export const IdleEventPriority = IdleLane

/** 当前更新优先级值 */
let currentUpdatePriority = NoLane


/**
 * 获取当前更新优先级
 * @returns 当前更新优先级
 */
export const getCurrentUpdatePriority = () => {
  return currentUpdatePriority
}

/**
 * 设置当前更新优先级
 * @param {*} newPriority 新的优先级
 */
export const setCurrentUpdatePriority = (newPriority) => {
  currentUpdatePriority = newPriority
}

/**
 * 判断事件优先级是否高于车道
 * @param {*} eventPriority 事件优先级
 * @param {*} lane 车道
 * @returns 如果事件优先级高于车道则返回 true
 */
export const isHigherEventPriority = (eventPriority, lane) => {
  // 二进制值越小，优先级越高
  return (eventPriority !== 0) && eventPriority < lane
}

/**
 * 将车道转换为事件优先级
 * @param {*} lanes 车道
 * @returns 与车道相对应的事件优先级
 */
export const lanesToEventPriority = (lanes) => {
  // 获取最高优先级车道
  const lane = getHighestPriorityLane(lanes)

  // DiscreteEventPriority: 0b0000000000000000000000000000001
  //                  lane: 0b0000000000000000000000000000100
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority
  }

  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority
  }

  // 如果包括非空闲工作，则返回默认事件优先级
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority
  }

  // 如果都不符合，则返回空闲事件优先级
  return IdleEventPriority
}
