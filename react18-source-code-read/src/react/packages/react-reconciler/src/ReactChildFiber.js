/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactElement} from 'shared/ReactElementType';
import type {
  ReactPortal,
  Thenable,
  ReactContext,
  ReactDebugInfo,
} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';
import type {Lanes} from './ReactFiberLane';
import type {ThenableState} from './ReactFiberThenable';

import getComponentNameFromFiber from 'react-reconciler/src/getComponentNameFromFiber';
import {
  Placement,
  ChildDeletion,
  Forked,
  PlacementDEV,
} from './ReactFiberFlags';
import {
  getIteratorFn,
  REACT_ELEMENT_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_PORTAL_TYPE,
  REACT_LAZY_TYPE,
  REACT_CONTEXT_TYPE,
} from 'shared/ReactSymbols';
import {
  ClassComponent,
  HostRoot,
  HostText,
  HostPortal,
  Fragment,
} from './ReactWorkTags';
import isArray from 'shared/isArray';
import assign from 'shared/assign';
import {checkPropStringCoercion} from 'shared/CheckStringCoercion';
import {enableRefAsProp} from 'shared/ReactFeatureFlags';

import {
  createWorkInProgress,
  resetWorkInProgress,
  createFiberFromElement,
  createFiberFromFragment,
  createFiberFromText,
  createFiberFromPortal,
} from './ReactFiber';
import {isCompatibleFamilyForHotReloading} from './ReactFiberHotReloading';
import {getIsHydrating} from './ReactFiberHydrationContext';
import {pushTreeFork} from './ReactFiberTreeContext';
import {createThenableState, trackUsedThenable} from './ReactFiberThenable';
import {readContextDuringReconcilation} from './ReactFiberNewContext';

// This tracks the thenables that are unwrapped during reconcilation.
let thenableState: ThenableState | null = null;
let thenableIndexCounter: number = 0;

function mergeDebugInfo(
  outer: ReactDebugInfo | null,
  inner: ReactDebugInfo | null | void,
): ReactDebugInfo | null {
  if (!__DEV__) {
    return null;
  }
  if (inner == null) {
    return outer;
  } else if (outer === null) {
    return inner;
  } else {
    // If we have two debugInfo, we need to create a new one. This makes the array no longer
    // live so we'll miss any future updates if we received more so ideally we should always
    // do this after both have fully resolved/unsuspended.
    return outer.concat(inner);
  }
}

let didWarnAboutMaps;
let didWarnAboutGenerators;
let didWarnAboutStringRefs;
let ownerHasKeyUseWarning;
let ownerHasFunctionTypeWarning;
let ownerHasSymbolTypeWarning;
let warnForMissingKey = (child: mixed, returnFiber: Fiber) => {};

if (__DEV__) {
  didWarnAboutMaps = false;
  didWarnAboutGenerators = false;
  didWarnAboutStringRefs = ({}: {[string]: boolean});

  /**
   * Warn if there's no key explicitly set on dynamic arrays of children or
   * object keys are not valid. This allows us to keep track of children between
   * updates.
   */
  ownerHasKeyUseWarning = ({}: {[string]: boolean});
  ownerHasFunctionTypeWarning = ({}: {[string]: boolean});
  ownerHasSymbolTypeWarning = ({}: {[string]: boolean});

  warnForMissingKey = (child: mixed, returnFiber: Fiber) => {
    if (child === null || typeof child !== 'object') {
      return;
    }
    if (!child._store || child._store.validated || child.key != null) {
      return;
    }

    if (typeof child._store !== 'object') {
      throw new Error(
        'React Component in warnForMissingKey should have a _store. ' +
          'This error is likely caused by a bug in React. Please file an issue.',
      );
    }

    // $FlowFixMe[cannot-write] unable to narrow type from mixed to writable object
    child._store.validated = true;

    const componentName = getComponentNameFromFiber(returnFiber) || 'Component';

    if (ownerHasKeyUseWarning[componentName]) {
      return;
    }
    ownerHasKeyUseWarning[componentName] = true;

    console.error(
      'Each child in a list should have a unique ' +
        '"key" prop. See https://reactjs.org/link/warning-keys for ' +
        'more information.',
    );
  };
}

function isReactClass(type: any) {
  return type.prototype && type.prototype.isReactComponent;
}

function unwrapThenable<T>(thenable: Thenable<T>): T {
  const index = thenableIndexCounter;
  thenableIndexCounter += 1;
  if (thenableState === null) {
    thenableState = createThenableState();
  }
  return trackUsedThenable(thenableState, thenable, index);
}

type CoercedStringRef = ((handle: mixed) => void) & {_stringRef: ?string, ...};

function convertStringRefToCallbackRef(
  returnFiber: Fiber,
  current: Fiber | null,
  element: ReactElement,
  mixedRef: any,
): CoercedStringRef {
  const owner: ?Fiber = (element._owner: any);
  if (!owner) {
    if (typeof mixedRef !== 'string') {
      throw new Error(
        'Expected ref to be a function, a string, an object returned by React.createRef(), or null.',
      );
    }
    throw new Error(
      `Element ref was specified as a string (${mixedRef}) but no owner was set. This could happen for one of` +
        ' the following reasons:\n' +
        '1. You may be adding a ref to a function component\n' +
        "2. You may be adding a ref to a component that was not created inside a component's render method\n" +
        '3. You have multiple copies of React loaded\n' +
        'See https://reactjs.org/link/refs-must-have-owner for more information.',
    );
  }
  if (owner.tag !== ClassComponent) {
    throw new Error(
      'Function components cannot have string refs. ' +
        'We recommend using useRef() instead. ' +
        'Learn more about using refs safely here: ' +
        'https://reactjs.org/link/strict-mode-string-ref',
    );
  }

  // At this point, we know the ref isn't an object or function but it could
  // be a number. Coerce it to a string.
  if (__DEV__) {
    checkPropStringCoercion(mixedRef, 'ref');
  }
  const stringRef = '' + mixedRef;

  if (__DEV__) {
    if (
      // Will already warn with "Function components cannot be given refs"
      !(typeof element.type === 'function' && !isReactClass(element.type))
    ) {
      const componentName =
        getComponentNameFromFiber(returnFiber) || 'Component';
      if (!didWarnAboutStringRefs[componentName]) {
        console.error(
          'Component "%s" contains the string ref "%s". Support for string refs ' +
            'will be removed in a future major release. We recommend using ' +
            'useRef() or createRef() instead. ' +
            'Learn more about using refs safely here: ' +
            'https://reactjs.org/link/strict-mode-string-ref',
          componentName,
          stringRef,
        );
        didWarnAboutStringRefs[componentName] = true;
      }
    }
  }

  const inst = owner.stateNode;
  if (!inst) {
    throw new Error(
      `Missing owner for string ref ${stringRef}. This error is likely caused by a ` +
        'bug in React. Please file an issue.',
    );
  }

  // Check if previous string ref matches new string ref
  if (
    current !== null &&
    current.ref !== null &&
    typeof current.ref === 'function' &&
    current.ref._stringRef === stringRef
  ) {
    // Reuse the existing string ref
    const currentRef: CoercedStringRef = ((current.ref: any): CoercedStringRef);
    return currentRef;
  }

  // Create a new string ref
  const ref = function (value: mixed) {
    const refs = inst.refs;
    if (value === null) {
      delete refs[stringRef];
    } else {
      refs[stringRef] = value;
    }
  };
  ref._stringRef = stringRef;
  return ref;
}

function coerceRef(
  returnFiber: Fiber,
  current: Fiber | null,
  workInProgress: Fiber,
  element: ReactElement,
): void {
  let mixedRef;
  if (enableRefAsProp) {
    // TODO: This is a temporary, intermediate step. When enableRefAsProp is on,
    // we should resolve the `ref` prop during the begin phase of the component
    // it's attached to (HostComponent, ClassComponent, etc).
    const refProp = element.props.ref;
    mixedRef = refProp !== undefined ? refProp : null;
  } else {
    // Old behavior.
    mixedRef = element.ref;
  }

  let coercedRef;
  if (
    mixedRef !== null &&
    typeof mixedRef !== 'function' &&
    typeof mixedRef !== 'object'
  ) {
    // Assume this is a string ref. If it's not, then this will throw an error
    // to the user.
    coercedRef = convertStringRefToCallbackRef(
      returnFiber,
      current,
      element,
      mixedRef,
    );

    if (enableRefAsProp) {
      // When enableRefAsProp is on, we should always use the props as the
      // source of truth for refs. Not a field on the fiber.
      //
      // In the case of string refs, this presents a problem, because string
      // refs are not passed around internally as strings; they are converted to
      // callback refs. The ref used by the reconciler is not the same as the
      // one the user provided.
      //
      // But since this is a deprecated feature anyway, what we can do is clone
      // the props object and replace it with the internal callback ref. Then we
      // can continue to use the props object as the source of truth.
      //
      // This means the internal callback ref will leak into userspace. The
      // receiving component will receive a callback ref even though the parent
      // passed a string. Which is weird, but again, this is a deprecated
      // feature, and we're only leaving it around behind a flag so that Meta
      // can keep using string refs temporarily while they finish migrating
      // their codebase.
      const userProvidedProps = workInProgress.pendingProps;
      const propsWithInternalCallbackRef = assign({}, userProvidedProps);
      propsWithInternalCallbackRef.ref = coercedRef;
      workInProgress.pendingProps = propsWithInternalCallbackRef;
    }
  } else {
    coercedRef = mixedRef;
  }

  // TODO: If enableRefAsProp is on, we shouldn't use the `ref` field. We
  // should always read the ref from the prop.
  workInProgress.ref = coercedRef;
}

function throwOnInvalidObjectType(returnFiber: Fiber, newChild: Object) {
  // $FlowFixMe[method-unbinding]
  const childString = Object.prototype.toString.call(newChild);

  throw new Error(
    `Objects are not valid as a React child (found: ${
      childString === '[object Object]'
        ? 'object with keys {' + Object.keys(newChild).join(', ') + '}'
        : childString
    }). ` +
      'If you meant to render a collection of children, use an array ' +
      'instead.',
  );
}

function warnOnFunctionType(returnFiber: Fiber, invalidChild: Function) {
  if (__DEV__) {
    const parentName = getComponentNameFromFiber(returnFiber) || 'Component';

    if (ownerHasFunctionTypeWarning[parentName]) {
      return;
    }
    ownerHasFunctionTypeWarning[parentName] = true;

    const name = invalidChild.displayName || invalidChild.name || 'Component';

    if (returnFiber.tag === HostRoot) {
      console.error(
        'Functions are not valid as a React child. This may happen if ' +
          'you return %s instead of <%s /> from render. ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  root.render(%s)',
        name,
        name,
        name,
      );
    } else {
      console.error(
        'Functions are not valid as a React child. This may happen if ' +
          'you return %s instead of <%s /> from render. ' +
          'Or maybe you meant to call this function rather than return it.\n' +
          '  <%s>{%s}</%s>',
        name,
        name,
        parentName,
        name,
        parentName,
      );
    }
  }
}

function warnOnSymbolType(returnFiber: Fiber, invalidChild: symbol) {
  if (__DEV__) {
    const parentName = getComponentNameFromFiber(returnFiber) || 'Component';

    if (ownerHasSymbolTypeWarning[parentName]) {
      return;
    }
    ownerHasSymbolTypeWarning[parentName] = true;

    const name = String(invalidChild);

    if (returnFiber.tag === HostRoot) {
      console.error(
        'Symbols are not valid as a React child.\n' + '  root.render(%s)',
        name,
      );
    } else {
      console.error(
        'Symbols are not valid as a React child.\n' + '  <%s>%s</%s>',
        parentName,
        name,
        parentName,
      );
    }
  }
}

function resolveLazy(lazyType: any) {
  const payload = lazyType._payload;
  const init = lazyType._init;
  return init(payload);
}

type ChildReconciler = (
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChild: any,
  lanes: Lanes,
) => Fiber | null;

// This wrapper function exists because I expect to clone the code in each path
// to be able to optimize each path individually by branching early. This needs
// a compiler or we can do it manually. Helpers that don't need this branching
// live outside of this function.
function createChildReconciler(
  shouldTrackSideEffects: boolean,
): ChildReconciler {
  function deleteChild(returnFiber: Fiber, childToDelete: Fiber): void {
    if (!shouldTrackSideEffects) {
      // Noop.
      return;
    }
    const deletions = returnFiber.deletions;
    if (deletions === null) {
      returnFiber.deletions = [childToDelete];
      returnFiber.flags |= ChildDeletion;
    } else {
      deletions.push(childToDelete);
    }
  }

  function deleteRemainingChildren(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
  ): null {
    if (!shouldTrackSideEffects) {
      // Noop.
      return null;
    }

    // TODO: For the shouldClone case, this could be micro-optimized a bit by
    // assuming that after the first child we've already added everything.
    let childToDelete = currentFirstChild;
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete);
      childToDelete = childToDelete.sibling;
    }
    return null;
  }

  function mapRemainingChildren(
    returnFiber: Fiber,
    currentFirstChild: Fiber,
  ): Map<string | number, Fiber> {
    // Add the remaining children to a temporary map so that we can find them by
    // keys quickly. Implicit (null) keys get added to this set with their index
    // instead.
    const existingChildren: Map<string | number, Fiber> = new Map();

    let existingChild: null | Fiber = currentFirstChild;
    while (existingChild !== null) {
      if (existingChild.key !== null) {
        existingChildren.set(existingChild.key, existingChild);
      } else {
        existingChildren.set(existingChild.index, existingChild);
      }
      existingChild = existingChild.sibling;
    }
    return existingChildren;
  }

  function useFiber(fiber: Fiber, pendingProps: mixed): Fiber {
    // We currently set sibling to null and index to 0 here because it is easy
    // to forget to do before returning it. E.g. for the single child case.
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
  }

  function placeChild(
    newFiber: Fiber,
    lastPlacedIndex: number,
    newIndex: number,
  ): number {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects) {
      // During hydration, the useId algorithm needs to know which fibers are
      // part of a list of children (arrays, iterators).
      newFiber.flags |= Forked;
      return lastPlacedIndex;
    }
    const current = newFiber.alternate;
    if (current !== null) {
      const oldIndex = current.index;
      if (oldIndex < lastPlacedIndex) {
        // This is a move.
        newFiber.flags |= Placement | PlacementDEV;
        return lastPlacedIndex;
      } else {
        // This item can stay in place.
        return oldIndex;
      }
    } else {
      // This is an insertion.
      newFiber.flags |= Placement | PlacementDEV;
      return lastPlacedIndex;
    }
  }

  function placeSingleChild(newFiber: Fiber): Fiber {
    if (shouldTrackSideEffects && newFiber.alternate === null) {
      newFiber.flags |= Placement | PlacementDEV;
    }
    return newFiber;
  }

  function updateTextNode(
    returnFiber: Fiber,
    current: Fiber | null,
    textContent: string,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ) {
    if (current === null || current.tag !== HostText) {
      // Insert
      const created = createFiberFromText(textContent, returnFiber.mode, lanes);
      created.return = returnFiber;
      if (__DEV__) {
        created._debugInfo = debugInfo;
      }
      return created;
    } else {
      // Update
      const existing = useFiber(current, textContent);
      existing.return = returnFiber;
      if (__DEV__) {
        existing._debugInfo = debugInfo;
      }
      return existing;
    }
  }

  function updateElement(
    returnFiber: Fiber,
    current: Fiber | null,
    element: ReactElement,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber {
    const elementType = element.type;
    if (elementType === REACT_FRAGMENT_TYPE) {
      return updateFragment(
        returnFiber,
        current,
        element.props.children,
        lanes,
        element.key,
        debugInfo,
      );
    }
    if (current !== null) {
      if (
        current.elementType === elementType ||
        // Keep this check inline so it only runs on the false path:
        (__DEV__
          ? isCompatibleFamilyForHotReloading(current, element)
          : false) ||
        // Lazy types should reconcile their resolved type.
        // We need to do this after the Hot Reloading check above,
        // because hot reloading has different semantics than prod because
        // it doesn't resuspend. So we can't let the call below suspend.
        (typeof elementType === 'object' &&
          elementType !== null &&
          elementType.$$typeof === REACT_LAZY_TYPE &&
          resolveLazy(elementType) === current.type)
      ) {
        // Move based on index
        const existing = useFiber(current, element.props);
        coerceRef(returnFiber, current, existing, element);
        existing.return = returnFiber;
        if (__DEV__) {
          existing._debugOwner = element._owner;
          existing._debugInfo = debugInfo;
        }
        return existing;
      }
    }
    // Insert
    const created = createFiberFromElement(element, returnFiber.mode, lanes);
    coerceRef(returnFiber, current, created, element);
    created.return = returnFiber;
    if (__DEV__) {
      created._debugInfo = debugInfo;
    }
    return created;
  }

  function updatePortal(
    returnFiber: Fiber,
    current: Fiber | null,
    portal: ReactPortal,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber {
    if (
      current === null ||
      current.tag !== HostPortal ||
      current.stateNode.containerInfo !== portal.containerInfo ||
      current.stateNode.implementation !== portal.implementation
    ) {
      // Insert
      const created = createFiberFromPortal(portal, returnFiber.mode, lanes);
      created.return = returnFiber;
      if (__DEV__) {
        created._debugInfo = debugInfo;
      }
      return created;
    } else {
      // Update
      const existing = useFiber(current, portal.children || []);
      existing.return = returnFiber;
      if (__DEV__) {
        existing._debugInfo = debugInfo;
      }
      return existing;
    }
  }

  function updateFragment(
    returnFiber: Fiber,
    current: Fiber | null,
    fragment: Iterable<React$Node>,
    lanes: Lanes,
    key: null | string,
    debugInfo: null | ReactDebugInfo,
  ): Fiber {
    if (current === null || current.tag !== Fragment) {
      // Insert
      const created = createFiberFromFragment(
        fragment,
        returnFiber.mode,
        lanes,
        key,
      );
      created.return = returnFiber;
      if (__DEV__) {
        created._debugInfo = debugInfo;
      }
      return created;
    } else {
      // Update
      const existing = useFiber(current, fragment);
      existing.return = returnFiber;
      if (__DEV__) {
        existing._debugInfo = debugInfo;
      }
      return existing;
    }
  }

  function createChild(
    returnFiber: Fiber,
    newChild: any,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber | null {
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      // Text nodes don't have keys. If the previous node is implicitly keyed
      // we can continue to replace it without aborting even if it is not a text
      // node.
      // 文本节点没有key。如果前一个节点有key的，我们可以继续替换它，即使它不是文本节点也不会中止。
      const created = createFiberFromText(
        '' + newChild,
        returnFiber.mode,
        lanes,
      );
      created.return = returnFiber;
      if (__DEV__) {
        created._debugInfo = debugInfo;
      }
      return created;
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const created = createFiberFromElement(
            newChild,
            returnFiber.mode,
            lanes,
          );
          coerceRef(returnFiber, null, created, newChild);
          created.return = returnFiber;
          if (__DEV__) {
            created._debugInfo = mergeDebugInfo(debugInfo, newChild._debugInfo);
          }
          return created;
        }
        case REACT_PORTAL_TYPE: {
          const created = createFiberFromPortal(
            newChild,
            returnFiber.mode,
            lanes,
          );
          created.return = returnFiber;
          if (__DEV__) {
            created._debugInfo = debugInfo;
          }
          return created;
        }
        case REACT_LAZY_TYPE: {
          const payload = newChild._payload;
          const init = newChild._init;
          return createChild(
            returnFiber,
            init(payload),
            lanes,
            mergeDebugInfo(debugInfo, newChild._debugInfo), // call merge after init
          );
        }
      }

      if (isArray(newChild) || getIteratorFn(newChild)) {
        const created = createFiberFromFragment(
          newChild,
          returnFiber.mode,
          lanes,
          null,
        );
        created.return = returnFiber;
        if (__DEV__) {
          created._debugInfo = mergeDebugInfo(debugInfo, newChild._debugInfo);
        }
        return created;
      }

      // Usable node types
      //
      // Unwrap the inner value and recursively call this function again.
      if (typeof newChild.then === 'function') {
        const thenable: Thenable<any> = (newChild: any);
        return createChild(
          returnFiber,
          unwrapThenable(thenable),
          lanes,
          mergeDebugInfo(debugInfo, newChild._debugInfo),
        );
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        const context: ReactContext<mixed> = (newChild: any);
        return createChild(
          returnFiber,
          readContextDuringReconcilation(returnFiber, context, lanes),
          lanes,
          debugInfo,
        );
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }
      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    }

    return null;
  }

  function updateSlot(
    returnFiber: Fiber,
    oldFiber: Fiber | null,
    newChild: any,
    lanes: Lanes,
    debugInfo: null | ReactDebugInfo,
  ): Fiber | null {
    // Update the fiber if the keys match, otherwise return null.
    const key = oldFiber !== null ? oldFiber.key : null;

    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      // Text nodes don't have keys. If the previous node is implicitly keyed
      // we can continue to replace it without aborting even if it is not a text
      // node.
      if (key !== null) {
        return null;
      }
      return updateTextNode(
        returnFiber,
        oldFiber,
        '' + newChild,
        lanes,
        debugInfo,
      );
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          if (newChild.key === key) {
            return updateElement(
              returnFiber,
              oldFiber,
              newChild,
              lanes,
              mergeDebugInfo(debugInfo, newChild._debugInfo),
            );
          } else {
            return null;
          }
        }
        case REACT_PORTAL_TYPE: {
          if (newChild.key === key) {
            return updatePortal(
              returnFiber,
              oldFiber,
              newChild,
              lanes,
              debugInfo,
            );
          } else {
            return null;
          }
        }
        case REACT_LAZY_TYPE: {
          const payload = newChild._payload;
          const init = newChild._init;
          return updateSlot(
            returnFiber,
            oldFiber,
            init(payload),
            lanes,
            mergeDebugInfo(debugInfo, newChild._debugInfo),
          );
        }
      }

      if (isArray(newChild) || getIteratorFn(newChild)) {
        if (key !== null) {
          return null;
        }

        return updateFragment(
          returnFiber,
          oldFiber,
          newChild,
          lanes,
          null,
          mergeDebugInfo(debugInfo, newChild._debugInfo),
        );
      }

      // Usable node types
      //
      // Unwrap the inner value and recursively call this function again.
      if (typeof newChild.then === 'function') {
        const thenable: Thenable<any> = (newChild: any);
        return updateSlot(
          returnFiber,
          oldFiber,
          unwrapThenable(thenable),
          lanes,
          debugInfo,
        );
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        const context: ReactContext<mixed> = (newChild: any);
        return updateSlot(
          returnFiber,
          oldFiber,
          readContextDuringReconcilation(returnFiber, context, lanes),
          lanes,
          debugInfo,
        );
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }
      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    }

    return null;
  }

  function updateFromMap(
    existingChildren: Map<string | number, Fiber>,
    returnFiber: Fiber,
    newIdx: number,
    newChild: any,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber | null {
    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      // Text nodes don't have keys, so we neither have to check the old nor
      // new node for the key. If both are text nodes, they match.
      const matchedFiber = existingChildren.get(newIdx) || null;
      return updateTextNode(
        returnFiber,
        matchedFiber,
        '' + newChild,
        lanes,
        debugInfo,
      );
    }

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIdx : newChild.key,
            ) || null;
          return updateElement(
            returnFiber,
            matchedFiber,
            newChild,
            lanes,
            mergeDebugInfo(debugInfo, newChild._debugInfo),
          );
        }
        case REACT_PORTAL_TYPE: {
          const matchedFiber =
            existingChildren.get(
              newChild.key === null ? newIdx : newChild.key,
            ) || null;
          return updatePortal(
            returnFiber,
            matchedFiber,
            newChild,
            lanes,
            debugInfo,
          );
        }
        case REACT_LAZY_TYPE:
          const payload = newChild._payload;
          const init = newChild._init;
          return updateFromMap(
            existingChildren,
            returnFiber,
            newIdx,
            init(payload),
            lanes,
            mergeDebugInfo(debugInfo, newChild._debugInfo),
          );
      }

      if (isArray(newChild) || getIteratorFn(newChild)) {
        const matchedFiber = existingChildren.get(newIdx) || null;
        return updateFragment(
          returnFiber,
          matchedFiber,
          newChild,
          lanes,
          null,
          mergeDebugInfo(debugInfo, newChild._debugInfo),
        );
      }

      // Usable node types
      //
      // Unwrap the inner value and recursively call this function again.
      if (typeof newChild.then === 'function') {
        const thenable: Thenable<any> = (newChild: any);
        return updateFromMap(
          existingChildren,
          returnFiber,
          newIdx,
          unwrapThenable(thenable),
          lanes,
          debugInfo,
        );
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        const context: ReactContext<mixed> = (newChild: any);
        return updateFromMap(
          existingChildren,
          returnFiber,
          newIdx,
          readContextDuringReconcilation(returnFiber, context, lanes),
          lanes,
          debugInfo,
        );
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }
      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    }

    return null;
  }

  /**
   * Warns if there is a duplicate or missing key
   */
  function warnOnInvalidKey(
    child: mixed,
    knownKeys: Set<string> | null,
    returnFiber: Fiber,
  ): Set<string> | null {
    if (__DEV__) {
      if (typeof child !== 'object' || child === null) {
        return knownKeys;
      }
      switch (child.$$typeof) {
        case REACT_ELEMENT_TYPE:
        case REACT_PORTAL_TYPE:
          warnForMissingKey(child, returnFiber);
          const key = child.key;
          if (typeof key !== 'string') {
            break;
          }
          if (knownKeys === null) {
            knownKeys = new Set();
            knownKeys.add(key);
            break;
          }
          if (!knownKeys.has(key)) {
            knownKeys.add(key);
            break;
          }
          console.error(
            'Encountered two children with the same key, `%s`. ' +
              'Keys should be unique so that components maintain their identity ' +
              'across updates. Non-unique keys may cause children to be ' +
              'duplicated and/or omitted — the behavior is unsupported and ' +
              'could change in a future version.',
            key,
          );
          break;
        case REACT_LAZY_TYPE:
          const payload = child._payload;
          const init = (child._init: any);
          warnOnInvalidKey(init(payload), knownKeys, returnFiber);
          break;
        default:
          break;
      }
    }
    return knownKeys;
  }

  function reconcileChildrenArray(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChildren: Array<any>,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber | null {
    // This algorithm can't optimize by searching from both ends since we
    // don't have backpointers on fibers. I'm trying to see how far we can get
    // with that model. If it ends up not being worth the tradeoffs, we can
    // add it later.

    // Even with a two ended optimization, we'd want to optimize for the case
    // where there are few changes and brute force the comparison instead of
    // going for the Map. It'd like to explore hitting that path first in
    // forward-only mode and only go for the Map once we notice that we need
    // lots of look ahead. This doesn't handle reversal as well as two ended
    // search but that's unusual. Besides, for the two ended optimization to
    // work on Iterables, we'd need to copy the whole set.

    // In this first iteration, we'll just live with hitting the bad case
    // (adding everything to a Map) in for every insert/move.

    // If you change this code, also update reconcileChildrenIterator() which
    // uses the same algorithm.

    if (__DEV__) {
      // First, validate keys.
      let knownKeys: Set<string> | null = null;
      for (let i = 0; i < newChildren.length; i++) {
        const child = newChildren[i];
        knownKeys = warnOnInvalidKey(child, knownKeys, returnFiber);
      }
    }

    let resultingFirstChild: Fiber | null = null; // 存储新生成的child
    let previousNewFiber: Fiber | null = null;

    let oldFiber = currentFirstChild;
    let lastPlacedIndex = 0;
    let newIdx = 0;
    let nextOldFiber = null;
    // ! 1. 从左边往右遍历，比较新老节点，如果节点可以复用，继续往右，否则就停止
    for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }
      const newFiber = updateSlot(
        returnFiber,
        oldFiber,
        newChildren[newIdx],
        lanes,
        debugInfo,
      );
      if (newFiber === null) {
        // TODO: This breaks on empty slots like null children. That's
        // unfortunate because it triggers the slow path all the time. We need
        // a better way to communicate whether this was a miss or null,
        // boolean, undefined, etc.
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }
        break;
      }
      if (shouldTrackSideEffects) {
        if (oldFiber && newFiber.alternate === null) {
          // We matched the slot, but we didn't reuse the existing fiber, so we
          // need to delete the existing child.
          deleteChild(returnFiber, oldFiber);
        }
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        // TODO: Move out of the loop. This only happens for the first run.
        resultingFirstChild = newFiber;
      } else {
        // TODO: Defer siblings if we're not at the right index for this slot.
        // I.e. if we had null values before, then we want to defer this
        // for each null value. However, we also don't want to call updateSlot
        // with the previous one.
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    // !2.1 新节点没了，（老节点还有）。则删除剩余的老节点即可
    // 0 1 2 3 4
    // 0 1 2 3
    if (newIdx === newChildren.length) {
      // We've reached the end of the new children. We can delete the rest.
      deleteRemainingChildren(returnFiber, oldFiber);
      if (getIsHydrating()) {
        const numberOfForks = newIdx;
        pushTreeFork(returnFiber, numberOfForks);
      }
      return resultingFirstChild;
    }
    // ! 2.2 (新节点还有)，老节点没了
    // 0 1 2 3 4
    // 0 1 2 3 4 5
    if (oldFiber === null) {
      // If we don't have any more existing children we can choose a fast path
      // since the rest will all be insertions.
      for (; newIdx < newChildren.length; newIdx++) {
        const newFiber = createChild(
          returnFiber,
          newChildren[newIdx],
          lanes,
          debugInfo,
        );
        if (newFiber === null) {
          continue;
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          // TODO: Move out of the loop. This only happens for the first run.
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
      if (getIsHydrating()) {
        const numberOfForks = newIdx;
        pushTreeFork(returnFiber, numberOfForks);
      }
      return resultingFirstChild;
    }


    // !2.3 新老节点都还有节点，但是因为老fiber是链表，不方便快速get与delete，
    // !   因此把老fiber链表中的节点放入Map中，后续操作这个Map的get与delete
    // 0 1|   4 5
    // 0 1| 7 8 2 3
    // Add all children to a key map for quick lookups.
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

    // Keep scanning and use the map to restore deleted items as moves.
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        newChildren[newIdx],
        lanes,
        debugInfo,
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          if (newFiber.alternate !== null) {
            // The new fiber is a work in progress, but if there exists a
            // current, that means that we reused the fiber. We need to delete
            // it from the child list so that we don't add it to the deletion
            // list.
            existingChildren.delete(
              newFiber.key === null ? newIdx : newFiber.key,
            );
          }
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

     // !3. 如果是组件更新阶段，此时新节点已经遍历完了，能复用的老节点都用完了，
    // ! 则最后查找Map里是否还有元素，如果有，则证明是新节点里不能复用的，也就是要被删除的元素，此时删除这些元素就可以了
    if (shouldTrackSideEffects) {
      // Any existing children that weren't consumed above were deleted. We need
      // to add them to the deletion list.
      existingChildren.forEach(child => deleteChild(returnFiber, child));
    }

    if (getIsHydrating()) {
      const numberOfForks = newIdx;
      pushTreeFork(returnFiber, numberOfForks);
    }
    return resultingFirstChild;
  }

  function reconcileChildrenIterator(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChildrenIterable: Iterable<mixed>,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber | null {
    // This is the same implementation as reconcileChildrenArray(),
    // but using the iterator instead.

    const iteratorFn = getIteratorFn(newChildrenIterable);

    if (typeof iteratorFn !== 'function') {
      throw new Error(
        'An object is not an iterable. This error is likely caused by a bug in ' +
          'React. Please file an issue.',
      );
    }

    if (__DEV__) {
      // We don't support rendering Generators because it's a mutation.
      // See https://github.com/facebook/react/issues/12995
      if (
        typeof Symbol === 'function' &&
        // $FlowFixMe[prop-missing] Flow doesn't know about toStringTag
        newChildrenIterable[Symbol.toStringTag] === 'Generator'
      ) {
        if (!didWarnAboutGenerators) {
          console.error(
            'Using Generators as children is unsupported and will likely yield ' +
              'unexpected results because enumerating a generator mutates it. ' +
              'You may convert it to an array with `Array.from()` or the ' +
              '`[...spread]` operator before rendering. Keep in mind ' +
              'you might need to polyfill these features for older browsers.',
          );
        }
        didWarnAboutGenerators = true;
      }

      // Warn about using Maps as children
      if ((newChildrenIterable: any).entries === iteratorFn) {
        if (!didWarnAboutMaps) {
          console.error(
            'Using Maps as children is not supported. ' +
              'Use an array of keyed ReactElements instead.',
          );
        }
        didWarnAboutMaps = true;
      }

      // First, validate keys.
      // We'll get a different iterator later for the main pass.
      const newChildren = iteratorFn.call(newChildrenIterable);
      if (newChildren) {
        let knownKeys: Set<string> | null = null;
        let step = newChildren.next();
        for (; !step.done; step = newChildren.next()) {
          const child = step.value;
          knownKeys = warnOnInvalidKey(child, knownKeys, returnFiber);
        }
      }
    }

    const newChildren = iteratorFn.call(newChildrenIterable);

    if (newChildren == null) {
      throw new Error('An iterable object provided no iterator.');
    }

    let resultingFirstChild: Fiber | null = null;
    let previousNewFiber: Fiber | null = null;

    let oldFiber = currentFirstChild;
    let lastPlacedIndex = 0;
    let newIdx = 0;
    let nextOldFiber = null;

    let step = newChildren.next();
    for (
      ;
      oldFiber !== null && !step.done;
      newIdx++, step = newChildren.next()
    ) {
      if (oldFiber.index > newIdx) {
        nextOldFiber = oldFiber;
        oldFiber = null;
      } else {
        nextOldFiber = oldFiber.sibling;
      }
      const newFiber = updateSlot(
        returnFiber,
        oldFiber,
        step.value,
        lanes,
        debugInfo,
      );
      if (newFiber === null) {
        // TODO: This breaks on empty slots like null children. That's
        // unfortunate because it triggers the slow path all the time. We need
        // a better way to communicate whether this was a miss or null,
        // boolean, undefined, etc.
        if (oldFiber === null) {
          oldFiber = nextOldFiber;
        }
        break;
      }
      if (shouldTrackSideEffects) {
        if (oldFiber && newFiber.alternate === null) {
          // We matched the slot, but we didn't reuse the existing fiber, so we
          // need to delete the existing child.
          deleteChild(returnFiber, oldFiber);
        }
      }
      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        // TODO: Move out of the loop. This only happens for the first run.
        resultingFirstChild = newFiber;
      } else {
        // TODO: Defer siblings if we're not at the right index for this slot.
        // I.e. if we had null values before, then we want to defer this
        // for each null value. However, we also don't want to call updateSlot
        // with the previous one.
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }

    if (step.done) {
      // We've reached the end of the new children. We can delete the rest.
      deleteRemainingChildren(returnFiber, oldFiber);
      if (getIsHydrating()) {
        const numberOfForks = newIdx;
        pushTreeFork(returnFiber, numberOfForks);
      }
      return resultingFirstChild;
    }

    if (oldFiber === null) {
      // If we don't have any more existing children we can choose a fast path
      // since the rest will all be insertions.
      for (; !step.done; newIdx++, step = newChildren.next()) {
        const newFiber = createChild(returnFiber, step.value, lanes, debugInfo);
        if (newFiber === null) {
          continue;
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          // TODO: Move out of the loop. This only happens for the first run.
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
      if (getIsHydrating()) {
        const numberOfForks = newIdx;
        pushTreeFork(returnFiber, numberOfForks);
      }
      return resultingFirstChild;
    }

    // Add all children to a key map for quick lookups.
    const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

    // Keep scanning and use the map to restore deleted items as moves.
    for (; !step.done; newIdx++, step = newChildren.next()) {
      const newFiber = updateFromMap(
        existingChildren,
        returnFiber,
        newIdx,
        step.value,
        lanes,
        debugInfo,
      );
      if (newFiber !== null) {
        if (shouldTrackSideEffects) {
          if (newFiber.alternate !== null) {
            // The new fiber is a work in progress, but if there exists a
            // current, that means that we reused the fiber. We need to delete
            // it from the child list so that we don't add it to the deletion
            // list.
            existingChildren.delete(
              newFiber.key === null ? newIdx : newFiber.key,
            );
          }
        }
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
        if (previousNewFiber === null) {
          resultingFirstChild = newFiber;
        } else {
          previousNewFiber.sibling = newFiber;
        }
        previousNewFiber = newFiber;
      }
    }

    if (shouldTrackSideEffects) {
      // Any existing children that weren't consumed above were deleted. We need
      // to add them to the deletion list.
      existingChildren.forEach(child => deleteChild(returnFiber, child));
    }

    if (getIsHydrating()) {
      const numberOfForks = newIdx;
      pushTreeFork(returnFiber, numberOfForks);
    }
    return resultingFirstChild;
  }

  function reconcileSingleTextNode(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    textContent: string,
    lanes: Lanes,
  ): Fiber {
    // There's no need to check for keys on text nodes since we don't have a
    // way to define them.
    // 文本节点没有key
    // 老fiber存在，且头结点是文本节点
    if (currentFirstChild !== null && currentFirstChild.tag === HostText) {
      // We already have an existing node so let's just update it and delete
      // the rest.
      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
      const existing = useFiber(currentFirstChild, textContent);
      existing.return = returnFiber;
      return existing;
    }
    // The existing first child is not a text node so we need to create one
    // and delete the existing ones.
    // 删除剩余节点
    deleteRemainingChildren(returnFiber, currentFirstChild);
    const created = createFiberFromText(textContent, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  function reconcileSingleElement(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    element: ReactElement,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber {
    const key = element.key;
    let child = currentFirstChild;

    // 检查老的fiber单链表中是否有可以复用的节点
    while (child !== null) {
      // TODO: If key === null and child.key === null, then this only applies to
      // the first item in the list.
      if (child.key === key) {
        const elementType = element.type;
        if (elementType === REACT_FRAGMENT_TYPE) {
          if (child.tag === Fragment) {
            // 新老都是Fragment
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = useFiber(child, element.props.children);
            existing.return = returnFiber;
            if (__DEV__) {
              existing._debugOwner = element._owner;
              existing._debugInfo = debugInfo;
            }
            return existing;
          }
        } else {
          if (
            child.elementType === elementType ||
            // Keep this check inline so it only runs on the false path:
            (__DEV__
              ? isCompatibleFamilyForHotReloading(child, element)
              : false) ||
            // Lazy types should reconcile their resolved type.
            // We need to do this after the Hot Reloading check above,
            // because hot reloading has different semantics than prod because
            // it doesn't resuspend. So we can't let the call below suspend.
            (typeof elementType === 'object' &&
              elementType !== null &&
              elementType.$$typeof === REACT_LAZY_TYPE &&
              resolveLazy(elementType) === child.type)
          ) {
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = useFiber(child, element.props);
            coerceRef(returnFiber, child, existing, element);
            existing.return = returnFiber;
            if (__DEV__) {
              existing._debugOwner = element._owner;
              existing._debugInfo = debugInfo;
            }
            return existing;
          }
        }
        // 如果key相同，类型不相同。不再查找
        deleteRemainingChildren(returnFiber, child);
        break;
      } else {
        // 这个老节点没法服用
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    // 1. 初次挂载 2. 没有找到可以服用的老节点
    if (element.type === REACT_FRAGMENT_TYPE) {
      const created = createFiberFromFragment(
        element.props.children,
        returnFiber.mode,
        lanes,
        element.key,
      );
      created.return = returnFiber;
      if (__DEV__) {
        created._debugInfo = debugInfo;
      }
      return created;
    } else {
      const created = createFiberFromElement(element, returnFiber.mode, lanes);
      coerceRef(returnFiber, currentFirstChild, created, element);
      created.return = returnFiber;
      if (__DEV__) {
        created._debugInfo = debugInfo;
      }
      return created;
    }
  }

  function reconcileSinglePortal(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    portal: ReactPortal,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber {
    const key = portal.key;
    let child = currentFirstChild;
    while (child !== null) {
      // TODO: If key === null and child.key === null, then this only applies to
      // the first item in the list.
      if (child.key === key) {
        if (
          child.tag === HostPortal &&
          child.stateNode.containerInfo === portal.containerInfo &&
          child.stateNode.implementation === portal.implementation
        ) {
          deleteRemainingChildren(returnFiber, child.sibling);
          const existing = useFiber(child, portal.children || []);
          existing.return = returnFiber;
          return existing;
        } else {
          deleteRemainingChildren(returnFiber, child);
          break;
        }
      } else {
        deleteChild(returnFiber, child);
      }
      child = child.sibling;
    }

    const created = createFiberFromPortal(portal, returnFiber.mode, lanes);
    created.return = returnFiber;
    return created;
  }

  // This API will tag the children with the side-effect of the reconciliation
  // itself. They will be added to the side-effect list as we pass through the
  // children and the parent.
  function reconcileChildFibersImpl(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null,
    newChild: any,
    lanes: Lanes,
    debugInfo: ReactDebugInfo | null,
  ): Fiber | null {
    // This function is not recursive.
    // If the top level item is an array, we treat it as a set of children,
    // not as a fragment. Nested arrays on the other hand will be treated as
    // fragment nodes. Recursion happens at the normal flow.

    // Handle top level unkeyed fragments as if they were arrays.
    // This leads to an ambiguity between <>{[...]}</> and <>...</>.
    // We treat the ambiguous cases above the same.
    // TODO: Let's use recursion like we do for Usable nodes?
    const isUnkeyedTopLevelFragment =
      typeof newChild === 'object' &&
      newChild !== null &&
      newChild.type === REACT_FRAGMENT_TYPE &&
      newChild.key === null;
      // 如果newChild是Fragment类型，且没有key，则直接协调其子节点
    if (isUnkeyedTopLevelFragment) {
      newChild = newChild.props.children;
    }

    // Handle object types
    // 单个节点、数组、迭代器、promise、context
    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(
            reconcileSingleElement(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes,
              mergeDebugInfo(debugInfo, newChild._debugInfo),
            ),
          );
        case REACT_PORTAL_TYPE:
          return placeSingleChild(
            reconcileSinglePortal(
              returnFiber,
              currentFirstChild,
              newChild,
              lanes,
              debugInfo,
            ),
          );
        case REACT_LAZY_TYPE:
          const payload = newChild._payload;
          const init = newChild._init;
          return reconcileChildFibersImpl(
            returnFiber,
            currentFirstChild,
            init(payload),
            lanes,
            mergeDebugInfo(debugInfo, newChild._debugInfo),
          );
      }

      if (isArray(newChild)) {
        return reconcileChildrenArray(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes,
          mergeDebugInfo(debugInfo, newChild._debugInfo),
        );
      }

      if (getIteratorFn(newChild)) {
        return reconcileChildrenIterator(
          returnFiber,
          currentFirstChild,
          newChild,
          lanes,
          mergeDebugInfo(debugInfo, newChild._debugInfo),
        );
      }

      // Usables are a valid React node type. When React encounters a Usable in
      // a child position, it unwraps it using the same algorithm as `use`. For
      // example, for promises, React will throw an exception to unwind the
      // stack, then replay the component once the promise resolves.
      //
      // A difference from `use` is that React will keep unwrapping the value
      // until it reaches a non-Usable type.
      //
      // e.g. Usable<Usable<Usable<T>>> should resolve to T
      //
      // The structure is a bit unfortunate. Ideally, we shouldn't need to
      // replay the entire begin phase of the parent fiber in order to reconcile
      // the children again. This would require a somewhat significant refactor,
      // because reconcilation happens deep within the begin phase, and
      // depending on the type of work, not always at the end. We should
      // consider as an future improvement.
      if (typeof newChild.then === 'function') {
        const thenable: Thenable<any> = (newChild: any);
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          unwrapThenable(thenable),
          lanes,
          mergeDebugInfo(debugInfo, thenable._debugInfo),
        );
      }

      if (newChild.$$typeof === REACT_CONTEXT_TYPE) {
        const context: ReactContext<mixed> = (newChild: any);
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          readContextDuringReconcilation(returnFiber, context, lanes),
          lanes,
          debugInfo,
        );
      }

      throwOnInvalidObjectType(returnFiber, newChild);
    }

    if (
      (typeof newChild === 'string' && newChild !== '') ||
      typeof newChild === 'number'
    ) {
      return placeSingleChild(
        reconcileSingleTextNode(
          returnFiber,
          currentFirstChild,
          '' + newChild,
          lanes,
        ),
      );
    }

    if (__DEV__) {
      if (typeof newChild === 'function') {
        warnOnFunctionType(returnFiber, newChild);
      }
      if (typeof newChild === 'symbol') {
        warnOnSymbolType(returnFiber, newChild);
      }
    }

    // Remaining cases are all treated as empty.
    return deleteRemainingChildren(returnFiber, currentFirstChild);
  }

  // * 协调子节点，构建新的子fiber结构，并且返回新的子fiber
  function reconcileChildFibers(
    returnFiber: Fiber,
    currentFirstChild: Fiber | null, // 老fiber的第一个子节点
    newChild: any,
    lanes: Lanes,
  ): Fiber | null {
    // This indirection only exists so we can reset `thenableState` at the end.
    // It should get inlined by Closure.
    thenableIndexCounter = 0;
    const firstChildFiber = reconcileChildFibersImpl(
      returnFiber,
      currentFirstChild,
      newChild,
      lanes,
      null, // debugInfo
    );

    thenableState = null;
    // Don't bother to reset `thenableIndexCounter` to 0 because it always gets
    // set at the beginning.
    return firstChildFiber;
  }

  return reconcileChildFibers;
}

export const reconcileChildFibers: ChildReconciler =
  createChildReconciler(true);
export const mountChildFibers: ChildReconciler = createChildReconciler(false);

export function resetChildReconcilerOnUnwind(): void {
  // On unwind, clear any pending thenables that were used.
  thenableState = null;
  thenableIndexCounter = 0;
}

export function cloneChildFibers(
  current: Fiber | null,
  workInProgress: Fiber,
): void {


  if (current !== null && workInProgress.child !== current.child) {
    throw new Error('Resuming work not yet implemented.');
  }

  if (workInProgress.child === null) {
    return;
  }

  let currentChild = workInProgress.child;
  let newChild = createWorkInProgress(currentChild, currentChild.pendingProps);
  workInProgress.child = newChild;

  newChild.return = workInProgress;
  while (currentChild.sibling !== null) {
    currentChild = currentChild.sibling;
    newChild = newChild.sibling = createWorkInProgress(
      currentChild,
      currentChild.pendingProps,
    );
    newChild.return = workInProgress;
  }
  newChild.sibling = null;
}

// Reset a workInProgress child set to prepare it for a second pass.
export function resetChildFibers(workInProgress: Fiber, lanes: Lanes): void {
  let child = workInProgress.child;
  while (child !== null) {
    resetWorkInProgress(child, lanes);
    child = child.sibling;
  }
}
