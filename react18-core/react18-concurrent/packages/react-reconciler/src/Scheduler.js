import * as Scheduler from 'scheduler'

export const scheduleCallback = Scheduler.unstable_scheduleCallback
export const shouldYield = Scheduler.unstable_shouldYield


export const ImmediatePriority = Scheduler.unstable_ImmediatePriority
export const UserBlockingPriority = Scheduler.unstable_UserBlockingPriority
export const NormalPriority = Scheduler.unstable_NormalPriority
export const LowPriority = Scheduler.unstable_LowPriority
export const IdlePriority = Scheduler.unstable_IdlePriority
