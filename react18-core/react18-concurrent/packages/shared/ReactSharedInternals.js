import * as React from 'react'

// 为什么要这么绕在这里导出，因为 shared 包是全局公共的
// 如果需要使用 ReactSharedInternals 就从这个全局公共的包里面找
// 而不是在 react 包里面找，这样可以保证后面 react 包里面的 ReactSharedInternals 有什么变化，只需要改这里
const ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED

export default ReactSharedInternals
