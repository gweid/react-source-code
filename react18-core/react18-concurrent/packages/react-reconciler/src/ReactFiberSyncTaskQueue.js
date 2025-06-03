import {
  DiscreteEventPriority,
  getCurrentUpdatePriority,
  setCurrentUpdatePriority
} from './ReactEventPriorities'

let syncQueue = null                // 同步任务队列
let isFlushingSyncQueue = false     // 是否正在执行同步队列 

/**
 * 调度同步任务(将同步任务放入同步任务队列)
 * 在 ensureRootIsScheduled 中进行同步异步任务区分的时候会调用
 * @param {Function} callback 
 */
export const scheduleSyncCallback = (callback) => {
  if (syncQueue === null) {
    syncQueue = [callback]
  } else {
    syncQueue.push(callback)
  }
}

/**
 * 执行同步任务队列中的任务，并清空同步任务队列
 * 这个函数会在同步模式下执行队列中的所有回调，并在完成后恢复之前的更新优先级
 */
export const flushSyncCallbacks = () => {
  if (!isFlushingSyncQueue && syncQueue !== null) {
    isFlushingSyncQueue = true
    
    let i = 0

    // 暂存当前的更新优先级
    const previousUpdatePriority = getCurrentUpdatePriority()

    try {
      const isSync = true
      const queue = syncQueue

      // 把优先级设置为同步优先级
      setCurrentUpdatePriority(DiscreteEventPriority)

      for (; i < queue.length; i++) {
        let callback = queue[i]

        do {
          callback = callback(isSync)
        } while (callback !== null)
      }

      syncQueue = null
    } finally {
      // 恢复之前的更新优先级
      setCurrentUpdatePriority(previousUpdatePriority)
      isFlushingSyncQueue = false
    }
  }
}
