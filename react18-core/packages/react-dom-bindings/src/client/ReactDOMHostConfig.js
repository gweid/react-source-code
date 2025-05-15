export const shouldSetTextContent = (type, props) => {
  return typeof props.children === 'string' || typeof props.children === 'number'
}
