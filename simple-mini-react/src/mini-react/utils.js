export const isType = (type) => {
  return Object.prototype.toString.call(type).slice(8, -1)
}