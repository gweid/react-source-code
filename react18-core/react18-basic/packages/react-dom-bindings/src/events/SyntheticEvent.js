import assign from "shared/assign"

const functionThatReturnsTrue = () => {
  return true;
}

const functionThatReturnsFalse = () => {
  return false;
}

// 定义一个接口，用来表示鼠标事件的某些属性
const MouseEventInterface = {
  clientX: 0,
  clientY: 0,
  // 还有很多其它属性...
}

/**
 * 创建一个合成事件构造器
 * @param {*} Interface 事件接口，定义了事件应有的属性
 * @returns 返回一个合成事件类的构造器
 */
const createSyntheticEvent = (Interface) => {
  /**
   * SyntheticBaseEvent 类表示一个合成事件(这里不用箭头函数，因为箭头函数不能做构造器)
   * 
   * @param {*} reactName React事件的名称
   * @param {*} reactEventType React事件类型
   * @param {*} targetInst Fiber 实例
   * @param {*} nativeEvent 原生的浏览器事件对象
   * @param {*} nativeEventTarget 触发事件目标元素
   * @returns
   */
  function SyntheticBaseEvent(
    reactName,
    reactEventType,
    targetInst,
    nativeEvent,
    nativeEventTarget
  ) {
    this._reactName = reactName
    this.type = reactEventType
    this._targetInst = targetInst
    this.nativeEvent = nativeEvent
    this.target = nativeEventTarget

    // 对于接口中定义的每一个属性，都将其值从原生事件对象中拷贝过来
    for(const propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) continue
      this[propName] = nativeEvent[propName]
    }

    // 初始状态下，事件的默认行为不被阻止，事件传播也没有被停止
    this.isDefaultPrevented = functionThatReturnsFalse
    this.isPropagationStopped = functionThatReturnsFalse

    return this
  }

  // 为合成事件类的原型添加 preventDefault 和 stopPropagation 方法
  // 抹平浏览器差异
  assign(SyntheticBaseEvent.prototype, {
    preventDefault() {
      const event = this.nativeEvent
      if (event.preventDefault) {
        event.preventDefault()
      } else {
        event.returnValue = false
      }
      this.isDefaultPrevented = functionThatReturnsTrue
    },
    stopPropagation() {
      const event = this.nativeEvent
      if (event.stopPropagation) {
        event.stopPropagation()
      } else {
        event.cancelBubble = true
      }
      this.isPropagationStopped = functionThatReturnsTrue
    }
  })

  return SyntheticBaseEvent
}

// 创建一个合成鼠标事件类
export const SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface)
