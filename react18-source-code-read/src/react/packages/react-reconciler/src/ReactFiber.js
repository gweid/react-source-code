/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from 'shared/ReactElementType';
import type {ReactFragment, ReactPortal, ReactScope} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';
import type {RootTag} from './ReactRootTags';
import type {WorkTag} from './ReactWorkTags';
import type {TypeOfMode} from './ReactTypeOfMode';
import type {Lanes} from './ReactFiberLane';
import type {SuspenseInstance} from './ReactFiberConfig';
import type {
  OffscreenProps,
  OffscreenInstance,
} from './ReactFiberActivityComponent';
import type {TracingMarkerInstance} from './ReactFiberTracingMarkerComponent';

import {
  supportsResources,
  supportsSingletons,
  isHostHoistableType,
  isHostSingletonType,
} from './ReactFiberConfig';
import {
  enableCache,
  enableProfilerTimer,
  enableScopeAPI,
  enableLegacyHidden,
  forceConcurrentByDefaultForTesting,
  allowConcurrentByDefault,
  enableTransitionTracing,
  enableDebugTracing,
  enableFloat,
  enableDO_NOT_USE_disableStrictPassiveEffect,
  enableRenderableContext,
} from 'shared/ReactFeatureFlags';
import {NoFlags, Placement, StaticMask} from './ReactFiberFlags';
import {ConcurrentRoot} from './ReactRootTags';
import {
  IndeterminateComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  HostHoistable,
  HostSingleton,
  ForwardRef,
  Fragment,
  Mode,
  ContextProvider,
  ContextConsumer,
  Profiler,
  SuspenseComponent,
  SuspenseListComponent,
  DehydratedFragment,
  FunctionComponent,
  MemoComponent,
  SimpleMemoComponent,
  LazyComponent,
  ScopeComponent,
  OffscreenComponent,
  LegacyHiddenComponent,
  CacheComponent,
  TracingMarkerComponent,
} from './ReactWorkTags';
import {OffscreenVisible} from './ReactFiberActivityComponent';
import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import {isDevToolsPresent} from './ReactFiberDevToolsHook';
import {
  resolveClassForHotReloading,
  resolveFunctionForHotReloading,
  resolveForwardRefForHotReloading,
} from './ReactFiberHotReloading';
import {NoLanes} from './ReactFiberLane';
import {
  NoMode,
  ConcurrentMode,
  DebugTracingMode,
  ProfileMode,
  StrictLegacyMode,
  StrictEffectsMode,
  ConcurrentUpdatesByDefaultMode,
  NoStrictPassiveEffectsMode,
} from './ReactTypeOfMode';
import {
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_DEBUG_TRACING_MODE_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_CONSUMER_TYPE,
  REACT_SUSPENSE_TYPE,
  REACT_SUSPENSE_LIST_TYPE,
  REACT_MEMO_TYPE,
  REACT_LAZY_TYPE,
  REACT_SCOPE_TYPE,
  REACT_OFFSCREEN_TYPE,
  REACT_LEGACY_HIDDEN_TYPE,
  REACT_CACHE_TYPE,
  REACT_TRACING_MARKER_TYPE,
} from 'shared/ReactSymbols';
import {TransitionTracingMarker} from './ReactFiberTracingMarkerComponent';
import {
  detachOffscreenInstance,
  attachOffscreenInstance,
} from './ReactFiberCommitWork';
import {getHostContext} from './ReactFiberHostContext';

export type {Fiber};

let hasBadMapPolyfill;

if (__DEV__) {
  hasBadMapPolyfill = false;
  try {
    const nonExtensibleObject = Object.preventExtensions({});
    /* eslint-disable no-new */
    new Map([[nonExtensibleObject, null]]);
    new Set([nonExtensibleObject]);
    /* eslint-enable no-new */
  } catch (e) {
    // TODO: Consider warning about bad polyfills
    hasBadMapPolyfill = true;
  }
}

function FiberNode(
  this: $FlowFixMe,
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance
  this.tag = tag; // ! 组件类型，用来快速判断当前 Fiber 类型，与下面 type 作用不同
  this.key = key; // ! 唯一标识
  this.elementType = null;
  this.type = null; // ! 组件类型。原生标签：字符串；类组件：类；函数组件：函数
  this.stateNode = null; // ! 如果组件是标签：真实 DOM 节点；如果组件的类组件：类组件实例；如果组件是函数组件：null

  // Fiber
  // ! 这里形成 Fiber 单链表结构
  this.return = null; // ! 父级 Fiber 节点
  this.child = null; // ! 第一个子 Fiber 节点
  this.sibling = null; // ! 下一个兄弟 Fiber 节点
  this.index = 0; // ! 记录了节点在当前层级的位置索引，用于 diff 的时候判断节点是否需要移动

  this.ref = null;
  this.refCleanup = null;

  this.pendingProps = pendingProps; // ! 新的 props
  this.memoizedProps = null; // ! 上一次的 props（当前页面上显示的 props）
  this.updateQueue = null; // ! 更新队列
  this.memoizedState = null; // ! 上一次的 state
  this.dependencies = null; // ! 依赖，比如 context

  this.mode = mode;

  // Effects
  // ! 副作用标识
  this.flags = NoFlags;
  this.subtreeFlags = NoFlags;
  this.deletions = null; // ! 需要删除的子节点

  this.lanes = NoLanes; // ! 优先级
  this.childLanes = NoLanes;

  this.alternate = null; // ! 用于存储更新前的 Fiber

  if (enableProfilerTimer) {
    // Note: The following is done to avoid a v8 performance cliff.
    //
    // Initializing the fields below to smis and later updating them with
    // double values will cause Fibers to end up having separate shapes.
    // This behavior/bug has something to do with Object.preventExtension().
    // Fortunately this only impacts DEV builds.
    // Unfortunately it makes React unusably slow for some applications.
    // To work around this, initialize the fields below with doubles.
    //
    // Learn more about this here:
    // https://github.com/facebook/react/issues/14365
    // https://bugs.chromium.org/p/v8/issues/detail?id=8538
    this.actualDuration = Number.NaN;
    this.actualStartTime = Number.NaN;
    this.selfBaseDuration = Number.NaN;
    this.treeBaseDuration = Number.NaN;

    // It's okay to replace the initial doubles with smis after initialization.
    // This won't trigger the performance cliff mentioned above,
    // and it simplifies other profiler code (including DevTools).
    this.actualDuration = 0;
    this.actualStartTime = -1;
    this.selfBaseDuration = 0;
    this.treeBaseDuration = 0;
  }

  if (__DEV__) {
    // This isn't directly used but is handy for debugging internals:
    this._debugInfo = null;
    this._debugOwner = null;
    this._debugNeedsRemount = false;
    this._debugHookTypes = null;
    if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
      Object.preventExtensions(this);
    }
  }
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.
function createFiber(
  tag: WorkTag,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
): Fiber {
  // $FlowFixMe[invalid-constructor]: the shapes are exact here but Flow doesn't like constructors
  return new FiberNode(tag, pendingProps, key, mode);
}

// ! 判断是否是类组件
function shouldConstruct(Component: Function) {
  const prototype = Component.prototype;
  return !!(prototype && prototype.isReactComponent);
}

export function isSimpleFunctionComponent(type: any): boolean {
  return (
    typeof type === 'function' &&
    !shouldConstruct(type) &&
    type.defaultProps === undefined
  );
}

export function resolveLazyComponentTag(Component: Function): WorkTag {
  if (typeof Component === 'function') {
    return shouldConstruct(Component) ? ClassComponent : FunctionComponent;
  } else if (Component !== undefined && Component !== null) {
    const $$typeof = Component.$$typeof;
    if ($$typeof === REACT_FORWARD_REF_TYPE) {
      return ForwardRef;
    }
    if ($$typeof === REACT_MEMO_TYPE) {
      return MemoComponent;
    }
  }
  return IndeterminateComponent;
}

// This is used to create an alternate fiber to do work on.
// * 入口位置包括 1. prepareFreshStack 2. 复用节点 useFiber
export function createWorkInProgress(current: Fiber, pendingProps: any): Fiber {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );
    workInProgress.elementType = current.elementType;
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    if (__DEV__) {
      // DEV-only fields

      workInProgress._debugOwner = current._debugOwner;
      workInProgress._debugHookTypes = current._debugHookTypes;
    }

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    // Needed because Blocks store data on type.
    workInProgress.type = current.type;

    // We already have an alternate.
    // Reset the effect tag.
    workInProgress.flags = NoFlags;

    // The effects are no longer valid.
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;

    if (enableProfilerTimer) {
      // We intentionally reset, rather than copy, actualDuration & actualStartTime.
      // This prevents time from endlessly accumulating in new commits.
      // This has the downside of resetting values for different priority renders,
      // But works for yielding (the common case) and should support resuming.
      workInProgress.actualDuration = 0;
      workInProgress.actualStartTime = -1;
    }
  }

  // Reset all effects except static ones.
  // Static effects are not specific to a render.
  workInProgress.flags = current.flags & StaticMask;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // Clone the dependencies object. This is mutated during the render phase, so
  // it cannot be shared with the current fiber.
  const currentDependencies = current.dependencies;
  workInProgress.dependencies =
    currentDependencies === null
      ? null
      : {
          lanes: currentDependencies.lanes,
          firstContext: currentDependencies.firstContext,
        };

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.refCleanup = current.refCleanup;

  if (enableProfilerTimer) {
    workInProgress.selfBaseDuration = current.selfBaseDuration;
    workInProgress.treeBaseDuration = current.treeBaseDuration;
  }

  if (__DEV__) {
    workInProgress._debugInfo = current._debugInfo;
    workInProgress._debugNeedsRemount = current._debugNeedsRemount;
    switch (workInProgress.tag) {
      case IndeterminateComponent:
      case FunctionComponent:
      case SimpleMemoComponent:
        workInProgress.type = resolveFunctionForHotReloading(current.type);
        break;
      case ClassComponent:
        workInProgress.type = resolveClassForHotReloading(current.type);
        break;
      case ForwardRef:
        workInProgress.type = resolveForwardRefForHotReloading(current.type);
        break;
      default:
        break;
    }
  }

  return workInProgress;
}

// Used to reuse a Fiber for a second pass.
export function resetWorkInProgress(
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber {
  // This resets the Fiber to what createFiber or createWorkInProgress would
  // have set the values to before during the first pass. Ideally this wouldn't
  // be necessary but unfortunately many code paths reads from the workInProgress
  // when they should be reading from current and writing to workInProgress.

  // We assume pendingProps, index, key, ref, return are still untouched to
  // avoid doing another reconciliation.

  // Reset the effect flags but keep any Placement tags, since that's something
  // that child fiber is setting, not the reconciliation.
  workInProgress.flags &= StaticMask | Placement;

  // The effects are no longer valid.

  const current = workInProgress.alternate;
  if (current === null) {
    // Reset to createFiber's initial values.
    workInProgress.childLanes = NoLanes;
    workInProgress.lanes = renderLanes;

    workInProgress.child = null;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.memoizedProps = null;
    workInProgress.memoizedState = null;
    workInProgress.updateQueue = null;

    workInProgress.dependencies = null;

    workInProgress.stateNode = null;

    if (enableProfilerTimer) {
      // Note: We don't reset the actualTime counts. It's useful to accumulate
      // actual time across multiple render passes.
      workInProgress.selfBaseDuration = 0;
      workInProgress.treeBaseDuration = 0;
    }
  } else {
    // Reset to the cloned values that createWorkInProgress would've.
    workInProgress.childLanes = current.childLanes;
    workInProgress.lanes = current.lanes;

    workInProgress.child = current.child;
    workInProgress.subtreeFlags = NoFlags;
    workInProgress.deletions = null;
    workInProgress.memoizedProps = current.memoizedProps;
    workInProgress.memoizedState = current.memoizedState;
    workInProgress.updateQueue = current.updateQueue;
    // Needed because Blocks store data on type.
    workInProgress.type = current.type;

    // Clone the dependencies object. This is mutated during the render phase, so
    // it cannot be shared with the current fiber.
    const currentDependencies = current.dependencies;
    workInProgress.dependencies =
      currentDependencies === null
        ? null
        : {
            lanes: currentDependencies.lanes,
            firstContext: currentDependencies.firstContext,
          };

    if (enableProfilerTimer) {
      // Note: We don't reset the actualTime counts. It's useful to accumulate
      // actual time across multiple render passes.
      workInProgress.selfBaseDuration = current.selfBaseDuration;
      workInProgress.treeBaseDuration = current.treeBaseDuration;
    }
  }

  return workInProgress;
}

export function createHostRootFiber(
  tag: RootTag,
  isStrictMode: boolean,
  concurrentUpdatesByDefaultOverride: null | boolean,
): Fiber {
  let mode;
  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode;
    if (isStrictMode === true) {
      mode |= StrictLegacyMode | StrictEffectsMode;
    }
    if (
      // We only use this flag for our repo tests to check both behaviors.
      forceConcurrentByDefaultForTesting
    ) {
      mode |= ConcurrentUpdatesByDefaultMode;
    } else if (
      // Only for internal experiments.
      allowConcurrentByDefault &&
      concurrentUpdatesByDefaultOverride
    ) {
      mode |= ConcurrentUpdatesByDefaultMode;
    }
  } else {
    mode = NoMode;
  }

  if (enableProfilerTimer && isDevToolsPresent) {
    // Always collect profile timings when DevTools are present.
    // This enables DevTools to start capturing timing at any point–
    // Without some nodes in the tree having empty base times.
    mode |= ProfileMode;
  }

  return createFiber(HostRoot, null, null, mode);
}

export function createFiberFromTypeAndProps(
  type: any, // React$ElementType
  key: null | string,
  pendingProps: any,
  owner: null | Fiber,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  let fiberTag = IndeterminateComponent;
  // The resolved type is set if we know what the final type will be. I.e. it's not lazy.
  let resolvedType = type;

  // ! 根据不同类型，创建 Fiber 独有的属性
  if (typeof type === 'function') {
    if (shouldConstruct(type)) {
      // ! 标识为 类组件
      fiberTag = ClassComponent;
      if (__DEV__) {
        resolvedType = resolveClassForHotReloading(resolvedType);
      }
    } else {
      if (__DEV__) {
        resolvedType = resolveFunctionForHotReloading(resolvedType);
      }
    }
  } else if (typeof type === 'string') {
    if (enableFloat && supportsResources && supportsSingletons) {
      const hostContext = getHostContext();
      fiberTag = isHostHoistableType(type, pendingProps, hostContext)
        ? HostHoistable
        : isHostSingletonType(type)
        ? HostSingleton
        : HostComponent;
    } else if (enableFloat && supportsResources) {
      const hostContext = getHostContext();
      fiberTag = isHostHoistableType(type, pendingProps, hostContext)
        ? HostHoistable
        : HostComponent;
    } else if (supportsSingletons) {
      fiberTag = isHostSingletonType(type) ? HostSingleton : HostComponent;
    } else {
      fiberTag = HostComponent;
    }
  } else {
    getTag: switch (type) {
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      case REACT_STRICT_MODE_TYPE:
        fiberTag = Mode;
        mode |= StrictLegacyMode;
        if ((mode & ConcurrentMode) !== NoMode) {
          // Strict effects should never run on legacy roots
          mode |= StrictEffectsMode;
          if (
            enableDO_NOT_USE_disableStrictPassiveEffect &&
            pendingProps.DO_NOT_USE_disableStrictPassiveEffect
          ) {
            mode |= NoStrictPassiveEffectsMode;
          }
        }
        break;
      case REACT_PROFILER_TYPE:
        return createFiberFromProfiler(pendingProps, mode, lanes, key);
      case REACT_SUSPENSE_TYPE:
        return createFiberFromSuspense(pendingProps, mode, lanes, key);
      case REACT_SUSPENSE_LIST_TYPE:
        return createFiberFromSuspenseList(pendingProps, mode, lanes, key);
      case REACT_OFFSCREEN_TYPE:
        return createFiberFromOffscreen(pendingProps, mode, lanes, key);
      case REACT_LEGACY_HIDDEN_TYPE:
        if (enableLegacyHidden) {
          return createFiberFromLegacyHidden(pendingProps, mode, lanes, key);
        }
      // Fall through
      case REACT_SCOPE_TYPE:
        if (enableScopeAPI) {
          return createFiberFromScope(type, pendingProps, mode, lanes, key);
        }
      // Fall through
      case REACT_CACHE_TYPE:
        if (enableCache) {
          return createFiberFromCache(pendingProps, mode, lanes, key);
        }
      // Fall through
      case REACT_TRACING_MARKER_TYPE:
        if (enableTransitionTracing) {
          return createFiberFromTracingMarker(pendingProps, mode, lanes, key);
        }
      // Fall through
      case REACT_DEBUG_TRACING_MODE_TYPE:
        if (enableDebugTracing) {
          fiberTag = Mode;
          mode |= DebugTracingMode;
          break;
        }
      // Fall through
      default: {
        if (typeof type === 'object' && type !== null) {
          switch (type.$$typeof) {
            case REACT_PROVIDER_TYPE:
              if (!enableRenderableContext) {
                fiberTag = ContextProvider;
                break getTag;
              }
            // Fall through
            case REACT_CONTEXT_TYPE:
              if (enableRenderableContext) {
                fiberTag = ContextProvider;
                break getTag;
              } else {
                fiberTag = ContextConsumer;
                break getTag;
              }
            case REACT_CONSUMER_TYPE:
              if (enableRenderableContext) {
                fiberTag = ContextConsumer;
                break getTag;
              }
            // Fall through
            case REACT_FORWARD_REF_TYPE:
              fiberTag = ForwardRef;
              if (__DEV__) {
                resolvedType = resolveForwardRefForHotReloading(resolvedType);
              }
              break getTag;
            case REACT_MEMO_TYPE:
              fiberTag = MemoComponent;
              break getTag;
            case REACT_LAZY_TYPE:
              fiberTag = LazyComponent;
              resolvedType = null;
              break getTag;
          }
        }
        let info = '';
        if (__DEV__) {
          if (
            type === undefined ||
            (typeof type === 'object' &&
              type !== null &&
              Object.keys(type).length === 0)
          ) {
            info +=
              ' You likely forgot to export your component from the file ' +
              "it's defined in, or you might have mixed up default and " +
              'named imports.';
          }
          const ownerName = owner ? getComponentNameFromFiber(owner) : null;
          if (ownerName) {
            info += '\n\nCheck the render method of `' + ownerName + '`.';
          }
        }

        throw new Error(
          'Element type is invalid: expected a string (for built-in ' +
            'components) or a class/function (for composite components) ' +
            `but got: ${type == null ? type : typeof type}.${info}`,
        );
      }
    }
  }

  // ! 创建 Fiber 节点
  const fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.elementType = type;
  fiber.type = resolvedType;
  fiber.lanes = lanes;

  if (__DEV__) {
    fiber._debugOwner = owner;
  }

  return fiber;
}

export function createFiberFromElement(
  element: ReactElement,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  let owner = null;
  if (__DEV__) {
    owner = element._owner;
  }
  const type = element.type;
  const key = element.key;
  const pendingProps = element.props;
  // ! 根据属性创建 Fiber
  const fiber = createFiberFromTypeAndProps(
    type,
    key,
    pendingProps,
    owner,
    mode,
    lanes,
  );
  if (__DEV__) {
    fiber._debugOwner = element._owner;
  }
  return fiber;
}

export function createFiberFromFragment(
  elements: ReactFragment,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(Fragment, elements, key, mode);
  fiber.lanes = lanes;
  return fiber;
}

function createFiberFromScope(
  scope: ReactScope,
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
) {
  const fiber = createFiber(ScopeComponent, pendingProps, key, mode);
  fiber.type = scope;
  fiber.elementType = scope;
  fiber.lanes = lanes;
  return fiber;
}

function createFiberFromProfiler(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  if (__DEV__) {
    if (typeof pendingProps.id !== 'string') {
      console.error(
        'Profiler must specify an "id" of type `string` as a prop. Received the type `%s` instead.',
        typeof pendingProps.id,
      );
    }
  }

  const fiber = createFiber(Profiler, pendingProps, key, mode | ProfileMode);
  fiber.elementType = REACT_PROFILER_TYPE;
  fiber.lanes = lanes;

  if (enableProfilerTimer) {
    fiber.stateNode = {
      effectDuration: 0,
      passiveEffectDuration: 0,
    };
  }

  return fiber;
}

export function createFiberFromSuspense(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(SuspenseComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromSuspenseList(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(SuspenseListComponent, pendingProps, key, mode);
  fiber.elementType = REACT_SUSPENSE_LIST_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromOffscreen(
  pendingProps: OffscreenProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(OffscreenComponent, pendingProps, key, mode);
  fiber.elementType = REACT_OFFSCREEN_TYPE;
  fiber.lanes = lanes;
  const primaryChildInstance: OffscreenInstance = {
    _visibility: OffscreenVisible,
    _pendingVisibility: OffscreenVisible,
    _pendingMarkers: null,
    _retryCache: null,
    _transitions: null,
    _current: null,
    detach: () => detachOffscreenInstance(primaryChildInstance),
    attach: () => attachOffscreenInstance(primaryChildInstance),
  };
  fiber.stateNode = primaryChildInstance;
  return fiber;
}

export function createFiberFromLegacyHidden(
  pendingProps: OffscreenProps,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(LegacyHiddenComponent, pendingProps, key, mode);
  fiber.elementType = REACT_LEGACY_HIDDEN_TYPE;
  fiber.lanes = lanes;
  // Adding a stateNode for legacy hidden because it's currently using
  // the offscreen implementation, which depends on a state node
  const instance: OffscreenInstance = {
    _visibility: OffscreenVisible,
    _pendingVisibility: OffscreenVisible,
    _pendingMarkers: null,
    _transitions: null,
    _retryCache: null,
    _current: null,
    detach: () => detachOffscreenInstance(instance),
    attach: () => attachOffscreenInstance(instance),
  };
  fiber.stateNode = instance;
  return fiber;
}

export function createFiberFromCache(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(CacheComponent, pendingProps, key, mode);
  fiber.elementType = REACT_CACHE_TYPE;
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromTracingMarker(
  pendingProps: any,
  mode: TypeOfMode,
  lanes: Lanes,
  key: null | string,
): Fiber {
  const fiber = createFiber(TracingMarkerComponent, pendingProps, key, mode);
  fiber.elementType = REACT_TRACING_MARKER_TYPE;
  fiber.lanes = lanes;
  const tracingMarkerInstance: TracingMarkerInstance = {
    tag: TransitionTracingMarker,
    transitions: null,
    pendingBoundaries: null,
    aborts: null,
    name: pendingProps.name,
  };
  fiber.stateNode = tracingMarkerInstance;
  return fiber;
}

// ! 创建文本 Fiber
export function createFiberFromText(
  content: string,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const fiber = createFiber(HostText, content, null, mode);
  fiber.lanes = lanes;
  return fiber;
}

export function createFiberFromHostInstanceForDeletion(): Fiber {
  const fiber = createFiber(HostComponent, null, null, NoMode);
  fiber.elementType = 'DELETED';
  return fiber;
}

export function createFiberFromDehydratedFragment(
  dehydratedNode: SuspenseInstance,
): Fiber {
  const fiber = createFiber(DehydratedFragment, null, null, NoMode);
  fiber.stateNode = dehydratedNode;
  return fiber;
}

export function createFiberFromPortal(
  portal: ReactPortal,
  mode: TypeOfMode,
  lanes: Lanes,
): Fiber {
  const pendingProps = portal.children !== null ? portal.children : [];
  const fiber = createFiber(HostPortal, pendingProps, portal.key, mode);
  fiber.lanes = lanes;
  fiber.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null, // Used by persistent updates
    implementation: portal.implementation,
  };
  return fiber;
}

// Used for stashing WIP properties to replay failed work in DEV.
export function assignFiberPropertiesInDEV(
  target: Fiber | null,
  source: Fiber,
): Fiber {
  if (target === null) {
    // This Fiber's initial properties will always be overwritten.
    // We only use a Fiber to ensure the same hidden class so DEV isn't slow.
    target = createFiber(IndeterminateComponent, null, null, NoMode);
  }

  // This is intentionally written as a list of all properties.
  // We tried to use Object.assign() instead but this is called in
  // the hottest path, and Object.assign() was too slow:
  // https://github.com/facebook/react/issues/12502
  // This code is DEV-only so size is not a concern.

  target.tag = source.tag;
  target.key = source.key;
  target.elementType = source.elementType;
  target.type = source.type;
  target.stateNode = source.stateNode;
  target.return = source.return;
  target.child = source.child;
  target.sibling = source.sibling;
  target.index = source.index;
  target.ref = source.ref;
  target.refCleanup = source.refCleanup;
  target.pendingProps = source.pendingProps;
  target.memoizedProps = source.memoizedProps;
  target.updateQueue = source.updateQueue;
  target.memoizedState = source.memoizedState;
  target.dependencies = source.dependencies;
  target.mode = source.mode;
  target.flags = source.flags;
  target.subtreeFlags = source.subtreeFlags;
  target.deletions = source.deletions;
  target.lanes = source.lanes;
  target.childLanes = source.childLanes;
  target.alternate = source.alternate;
  if (enableProfilerTimer) {
    target.actualDuration = source.actualDuration;
    target.actualStartTime = source.actualStartTime;
    target.selfBaseDuration = source.selfBaseDuration;
    target.treeBaseDuration = source.treeBaseDuration;
  }

  target._debugInfo = source._debugInfo;
  target._debugOwner = source._debugOwner;
  target._debugNeedsRemount = source._debugNeedsRemount;
  target._debugHookTypes = source._debugHookTypes;
  return target;
}
