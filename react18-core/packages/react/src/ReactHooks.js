import ReactCurrentDispatcher from './ReactCurrentDispatcher'

const resolveDispatcher = () => {
  return ReactCurrentDispatcher.current
}

export const useReducer = (reducer, initialArg) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useReducer(reducer, initialArg)
}
