import { isTypeOf } from './utils'
import { updateQueue, flushUpdateQueue } from './Component'

export const addEvent = (dom, eventName, eventFunc) => {
  // 记录原 dom 的事件，用于后面与合成事件建立关联
  dom.attach = dom.attach || {}
  dom.attach[eventName] = eventFunc

  // 事件合成机制的核心一：事件绑定到 document 上
  if (document[eventName]) return
  document[eventName] = dispatchEvent
}

const dispatchEvent = (nativeEvent) => {
  // console.log(nativeEvent);
  // nativeEvent 的值就是事件对象，比如点击事件，nativeEvent 就是当前元素点击的各种值，比如位置等
  // 可以通过: document.onclick = function(event) { console.log(event) } 查看下这个事件对象
 
  updateQueue.isBatch = true

  // 事件合成机制的核心二：屏蔽浏览器之间的差异
  const syntheticEvent = createSyntheticEvent(nativeEvent)

  // 这个 target 是触发事件的那个元素，就是事件源
  let target = nativeEvent.target
  // 触发事件，并且处理事件冒泡: 可能事件源和他的父节点都绑定了点击事件，所以一层层往外查看所有父节点有没有绑定点击事件
  // 绑定的事件挂载在：target.attach 上
  while(target) {
    syntheticEvent.currentTarget = target
    const eventName = `on${nativeEvent.type}` 
    // 这里能拿到 attach 对象，是因 为上面 addEvent 挂载了
    const eventFunc = target.attach && target.attach[eventName]
    // 将合成事件对象传递到源事件中
    eventFunc && eventFunc(syntheticEvent)

    // 如果阻止冒泡了，退出循环
    if (syntheticEvent.isPropagationStopped) break

    // 向上找父节点，只要有父节点，就会一直循环
    target = target.parentNode
  }

  flushUpdateQueue()
}

// 自定义事件，屏蔽浏览器之间的差异
const createSyntheticEvent = (nativeEvent) => {
  // 因为 react 的事件对象都是自定义的，所以这里将源事件对象进行拷贝一份，再加自定义属性
  const nativeEventKeyVaule = {}
  for (let key in nativeEvent) {
    nativeEventKeyVaule[key] = isTypeOf(nativeEvent[key], 'Function')
      ? nativeEvent[key].bind(nativeEvent) // 如果事件属性是函数，绑定上下文为原来的 nativeEvent
      : nativeEvent[key]
  }

  // 为合成事件对象扩展阻止默认事件和阻止事件冒泡
  const syntheticEvent = Object.assign(nativeEventKeyVaule, {
    nativeEvent, // 将原始的事件对象也保存起来
    isDefaultPrevented: false, // 是否阻止默认事件
    isPropagationStopped: false, // 是否阻止事件冒泡
    preventDefault() {
      // 注意，这里的 this 指向当前 syntheticEvent 这个对象
      this.isDefaultPrevented = true

      // 处理不同浏览器事件兼容
      if (this.nativeEvent.preventDefault) {
        this.nativeEvent.preventDefault()
      } else {
        // IE 浏览器
        this.nativeEvent.returnVaule = false
      }
    },
    stopPropagation() {
      this.isPropagationStopped = true

      // 处理不同浏览器事件兼容
      if (this.nativeEvent.stopPropagation) {
        this.nativeEvent.stopPropagation()
      } else {
        // IE 浏览器
        this.nativeEvent.cancelBubble = false
      }
    } 
  })

  return syntheticEvent
}
