import ReactCurrentDispatcher from './ReactCurrentDispatcher'

const resolveDispatcher = () => {
  return ReactCurrentDispatcher.current
}

export const useReducer = (reducer, initialArg) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useReducer(reducer, initialArg)
}

export const useState = (initialState) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

export const useEffect = (create, deps) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useEffect(create, deps)
}

export const useLayoutEffect = (create, deps) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useLayoutEffect(create, deps)
}
