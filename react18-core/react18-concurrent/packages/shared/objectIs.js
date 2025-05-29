function is(x, y) {
  return (
    (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y)
  )
}

const objectIs = typeof Object.is === 'function' ? Object.is : is;

export default objectIs;
