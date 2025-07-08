/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 * @jest-environment node
 */

'use strict';

let React;
let ReactDOM;
let ReactTestRenderer;
let ReactDebugTools;
let act;
let useMemoCache;

function normalizeSourceLoc(tree) {
  tree.forEach(node => {
    if (node.hookSource) {
      node.hookSource.fileName = '**';
      node.hookSource.lineNumber = 0;
      node.hookSource.columnNumber = 0;
    }
    normalizeSourceLoc(node.subHooks);
  });
  return tree;
}

describe('ReactHooksInspectionIntegration', () => {
  beforeEach(() => {
    jest.resetModules();
    React = require('react');
    ReactTestRenderer = require('react-test-renderer');
    ReactDOM = require('react-dom');
    act = require('internal-test-utils').act;
    ReactDebugTools = require('react-debug-tools');
    useMemoCache = React.unstable_useMemoCache;
  });

  it('should inspect the current state of useState hooks', async () => {
    const useState = React.useState;
    function Foo(props) {
      const [state1, setState1] = useState('hello');
      const [state2, setState2] = useState('world');
      return (
        <div onMouseDown={setState1} onMouseUp={setState2}>
          {state1} {state2}
        </div>
      );
    }
    const renderer = ReactTestRenderer.create(<Foo prop="prop" />);

    let childFiber = renderer.root.findByType(Foo)._currentFiber();
    let tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "hello",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "world",
        },
      ]
    `);

    const {onMouseDown: setStateA, onMouseUp: setStateB} =
      renderer.root.findByType('div').props;

    await act(() => setStateA('Hi'));

    childFiber = renderer.root.findByType(Foo)._currentFiber();
    tree = ReactDebugTools.inspectHooksOfFiber(childFiber);

    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "Hi",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "world",
        },
      ]
    `);

    await act(() => setStateB('world!'));

    childFiber = renderer.root.findByType(Foo)._currentFiber();
    tree = ReactDebugTools.inspectHooksOfFiber(childFiber);

    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "Hi",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "world!",
        },
      ]
    `);
  });

  it('should inspect the current state of all stateful hooks', async () => {
    const outsideRef = React.createRef();
    function effect() {}
    function Foo(props) {
      const [state1, setState] = React.useState('a');
      const [state2, dispatch] = React.useReducer((s, a) => a.value, 'b');
      const ref = React.useRef('c');

      React.useLayoutEffect(effect);
      React.useEffect(effect);

      React.useImperativeHandle(
        outsideRef,
        () => {
          // Return a function so that jest treats them as non-equal.
          return function Instance() {};
        },
        [],
      );

      React.useMemo(() => state1 + state2, [state1]);

      function update() {
        setState('A');
        dispatch({value: 'B'});
        ref.current = 'C';
      }
      const memoizedUpdate = React.useCallback(update, []);
      return (
        <div onClick={memoizedUpdate}>
          {state1} {state2}
        </div>
      );
    }
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Foo prop="prop" />);
    });

    let childFiber = renderer.root.findByType(Foo)._currentFiber();

    const {onClick: updateStates} = renderer.root.findByType('div').props;

    let tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "a",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": true,
          "name": "Reducer",
          "subHooks": [],
          "value": "b",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Ref",
          "subHooks": [],
          "value": "c",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 3,
          "isStateEditable": false,
          "name": "LayoutEffect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 4,
          "isStateEditable": false,
          "name": "Effect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 5,
          "isStateEditable": false,
          "name": "ImperativeHandle",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 6,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "ab",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 7,
          "isStateEditable": false,
          "name": "Callback",
          "subHooks": [],
          "value": [Function],
        },
      ]
    `);

    await act(() => {
      updateStates();
    });

    childFiber = renderer.root.findByType(Foo)._currentFiber();
    tree = ReactDebugTools.inspectHooksOfFiber(childFiber);

    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "A",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": true,
          "name": "Reducer",
          "subHooks": [],
          "value": "B",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Ref",
          "subHooks": [],
          "value": "C",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 3,
          "isStateEditable": false,
          "name": "LayoutEffect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 4,
          "isStateEditable": false,
          "name": "Effect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 5,
          "isStateEditable": false,
          "name": "ImperativeHandle",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 6,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "Ab",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 7,
          "isStateEditable": false,
          "name": "Callback",
          "subHooks": [],
          "value": [Function],
        },
      ]
    `);
  });

  it('should inspect the current state of all stateful hooks, including useInsertionEffect', async () => {
    const useInsertionEffect = React.useInsertionEffect;
    const outsideRef = React.createRef();
    function effect() {}
    function Foo(props) {
      const [state1, setState] = React.useState('a');
      const [state2, dispatch] = React.useReducer((s, a) => a.value, 'b');
      const ref = React.useRef('c');

      useInsertionEffect(effect);
      React.useLayoutEffect(effect);
      React.useEffect(effect);

      React.useImperativeHandle(
        outsideRef,
        () => {
          // Return a function so that jest treats them as non-equal.
          return function Instance() {};
        },
        [],
      );

      React.useMemo(() => state1 + state2, [state1]);

      async function update() {
        setState('A');
        dispatch({value: 'B'});
        ref.current = 'C';
      }
      const memoizedUpdate = React.useCallback(update, []);
      return (
        <div onClick={memoizedUpdate}>
          {state1} {state2}
        </div>
      );
    }
    let renderer;
    await act(() => {
      renderer = ReactTestRenderer.create(<Foo prop="prop" />);
    });

    let childFiber = renderer.root.findByType(Foo)._currentFiber();

    const {onClick: updateStates} = renderer.root.findByType('div').props;

    let tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "a",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": true,
          "name": "Reducer",
          "subHooks": [],
          "value": "b",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Ref",
          "subHooks": [],
          "value": "c",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 3,
          "isStateEditable": false,
          "name": "InsertionEffect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 4,
          "isStateEditable": false,
          "name": "LayoutEffect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 5,
          "isStateEditable": false,
          "name": "Effect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 6,
          "isStateEditable": false,
          "name": "ImperativeHandle",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 7,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "ab",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 8,
          "isStateEditable": false,
          "name": "Callback",
          "subHooks": [],
          "value": [Function],
        },
      ]
    `);

    await act(() => {
      updateStates();
    });

    childFiber = renderer.root.findByType(Foo)._currentFiber();
    tree = ReactDebugTools.inspectHooksOfFiber(childFiber);

    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "A",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": true,
          "name": "Reducer",
          "subHooks": [],
          "value": "B",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Ref",
          "subHooks": [],
          "value": "C",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 3,
          "isStateEditable": false,
          "name": "InsertionEffect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 4,
          "isStateEditable": false,
          "name": "LayoutEffect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 5,
          "isStateEditable": false,
          "name": "Effect",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 6,
          "isStateEditable": false,
          "name": "ImperativeHandle",
          "subHooks": [],
          "value": [Function],
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 7,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "Ab",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 8,
          "isStateEditable": false,
          "name": "Callback",
          "subHooks": [],
          "value": [Function],
        },
      ]
    `);
  });

  it('should inspect the value of the current provider in useContext', () => {
    const MyContext = React.createContext('default');
    function Foo(props) {
      const value = React.useContext(MyContext);
      return <div>{value}</div>;
    }
    const renderer = ReactTestRenderer.create(
      <MyContext.Provider value="contextual">
        <Foo prop="prop" />
      </MyContext.Provider>,
    );
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": null,
          "isStateEditable": false,
          "name": "Context",
          "subHooks": [],
          "value": "contextual",
        },
      ]
    `);
  });

  it('should inspect forwardRef', () => {
    const obj = function () {};
    const Foo = React.forwardRef(function (props, ref) {
      React.useImperativeHandle(ref, () => obj);
      return <div />;
    });
    const ref = React.createRef();
    const renderer = ReactTestRenderer.create(<Foo ref={ref} />);

    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": undefined,
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": false,
          "name": "ImperativeHandle",
          "subHooks": [],
          "value": [Function],
        },
      ]
    `);
  });

  it('should inspect memo', () => {
    function InnerFoo(props) {
      const [value] = React.useState('hello');
      return <div>{value}</div>;
    }
    const Foo = React.memo(InnerFoo);
    const renderer = ReactTestRenderer.create(<Foo />);
    // TODO: Test renderer findByType is broken for memo. Have to search for the inner.
    const childFiber = renderer.root.findByType(InnerFoo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "InnerFoo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "hello",
        },
      ]
    `);
  });

  it('should inspect custom hooks', () => {
    function useCustom() {
      const [value] = React.useState('hello');
      return value;
    }
    function Foo(props) {
      const value = useCustom();
      return <div>{value}</div>;
    }
    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": null,
          "isStateEditable": false,
          "name": "Custom",
          "subHooks": [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "useCustom",
                "lineNumber": 0,
              },
              "id": 0,
              "isStateEditable": true,
              "name": "State",
              "subHooks": [],
              "value": "hello",
            },
          ],
          "value": undefined,
        },
      ]
    `);
  });

  it('should support composite useTransition hook', () => {
    function Foo(props) {
      React.useTransition();
      const memoizedValue = React.useMemo(() => 'hello', []);
      React.useMemo(() => 'not used', []);
      return <div>{memoizedValue}</div>;
    }
    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": null,
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": false,
          "name": "Transition",
          "subHooks": [],
          "value": undefined,
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "hello",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "not used",
        },
      ]
    `);
  });

  it('should support useDeferredValue hook', () => {
    function Foo(props) {
      React.useDeferredValue('abc');
      const memoizedValue = React.useMemo(() => 1, []);
      React.useMemo(() => 2, []);
      return <div>{memoizedValue}</div>;
    }
    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": null,
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": false,
          "name": "DeferredValue",
          "subHooks": [],
          "value": "abc",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": 1,
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": 2,
        },
      ]
    `);
  });

  it('should support useId hook', () => {
    function Foo(props) {
      const id = React.useId();
      const [state] = React.useState('hello');
      return <div id={id}>{state}</div>;
    }

    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);

    expect(tree.length).toEqual(2);

    expect(tree[0].id).toEqual(0);
    expect(tree[0].isStateEditable).toEqual(false);
    expect(tree[0].name).toEqual('Id');
    expect(String(tree[0].value).startsWith(':r')).toBe(true);

    expect(normalizeSourceLoc(tree)[1]).toMatchInlineSnapshot(`
      {
        "debugInfo": null,
        "hookSource": {
          "columnNumber": 0,
          "fileName": "**",
          "functionName": "Foo",
          "lineNumber": 0,
        },
        "id": 1,
        "isStateEditable": true,
        "name": "State",
        "subHooks": [],
        "value": "hello",
      }
    `);
  });

  describe('useMemoCache', () => {
    // @gate enableUseMemoCacheHook
    it('should not be inspectable', () => {
      function Foo() {
        const $ = useMemoCache(1);
        let t0;

        if ($[0] === Symbol.for('react.memo_cache_sentinel')) {
          t0 = <div>{1}</div>;
          $[0] = t0;
        } else {
          t0 = $[0];
        }

        return t0;
      }

      const renderer = ReactTestRenderer.create(<Foo />);
      const childFiber = renderer.root.findByType(Foo)._currentFiber();
      const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);

      expect(tree.length).toEqual(0);
    });

    // @gate enableUseMemoCacheHook
    it('should work in combination with other hooks', () => {
      function useSomething() {
        const [something] = React.useState(null);
        const changeOtherSomething = React.useCallback(() => {}, [something]);

        return [something, changeOtherSomething];
      }

      function Foo() {
        const $ = useMemoCache(10);

        useSomething();
        React.useState(1);
        React.useEffect(() => {});

        let t0;

        if ($[0] === Symbol.for('react.memo_cache_sentinel')) {
          t0 = <div>{1}</div>;
          $[0] = t0;
        } else {
          t0 = $[0];
        }

        return t0;
      }

      const renderer = ReactTestRenderer.create(<Foo />);
      const childFiber = renderer.root.findByType(Foo)._currentFiber();
      const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);

      expect(tree.length).toEqual(3);
    });
  });

  describe('useDebugValue', () => {
    it('should support inspectable values for multiple custom hooks', () => {
      function useLabeledValue(label) {
        const [value] = React.useState(label);
        React.useDebugValue(`custom label ${label}`);
        return value;
      }
      function useAnonymous(label) {
        const [value] = React.useState(label);
        return value;
      }
      function Example() {
        useLabeledValue('a');
        React.useState('b');
        useAnonymous('c');
        useLabeledValue('d');
        return null;
      }
      const renderer = ReactTestRenderer.create(<Example />);
      const childFiber = renderer.root.findByType(Example)._currentFiber();
      const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
      if (__DEV__) {
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "LabeledValue",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useLabeledValue",
                    "lineNumber": 0,
                  },
                  "id": 0,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": "a",
                },
              ],
              "value": "custom label a",
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": 1,
              "isStateEditable": true,
              "name": "State",
              "subHooks": [],
              "value": "b",
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "Anonymous",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useAnonymous",
                    "lineNumber": 0,
                  },
                  "id": 2,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": "c",
                },
              ],
              "value": undefined,
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "LabeledValue",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useLabeledValue",
                    "lineNumber": 0,
                  },
                  "id": 3,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": "d",
                },
              ],
              "value": "custom label d",
            },
          ]
        `);
      } else
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "LabeledValue",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useLabeledValue",
                    "lineNumber": 0,
                  },
                  "id": 0,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": "a",
                },
              ],
              "value": undefined,
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": 1,
              "isStateEditable": true,
              "name": "State",
              "subHooks": [],
              "value": "b",
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "Anonymous",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useAnonymous",
                    "lineNumber": 0,
                  },
                  "id": 2,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": "c",
                },
              ],
              "value": undefined,
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "LabeledValue",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useLabeledValue",
                    "lineNumber": 0,
                  },
                  "id": 3,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": "d",
                },
              ],
              "value": undefined,
            },
          ]
        `);
    });

    it('should support inspectable values for nested custom hooks', () => {
      function useInner() {
        React.useDebugValue('inner');
        React.useState(0);
      }
      function useOuter() {
        React.useDebugValue('outer');
        useInner();
      }
      function Example() {
        useOuter();
        return null;
      }
      const renderer = ReactTestRenderer.create(<Example />);
      const childFiber = renderer.root.findByType(Example)._currentFiber();
      const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
      if (__DEV__) {
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "Outer",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useOuter",
                    "lineNumber": 0,
                  },
                  "id": null,
                  "isStateEditable": false,
                  "name": "Inner",
                  "subHooks": [
                    {
                      "debugInfo": null,
                      "hookSource": {
                        "columnNumber": 0,
                        "fileName": "**",
                        "functionName": "useInner",
                        "lineNumber": 0,
                      },
                      "id": 0,
                      "isStateEditable": true,
                      "name": "State",
                      "subHooks": [],
                      "value": 0,
                    },
                  ],
                  "value": "inner",
                },
              ],
              "value": "outer",
            },
          ]
        `);
      } else
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "Outer",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useOuter",
                    "lineNumber": 0,
                  },
                  "id": null,
                  "isStateEditable": false,
                  "name": "Inner",
                  "subHooks": [
                    {
                      "debugInfo": null,
                      "hookSource": {
                        "columnNumber": 0,
                        "fileName": "**",
                        "functionName": "useInner",
                        "lineNumber": 0,
                      },
                      "id": 0,
                      "isStateEditable": true,
                      "name": "State",
                      "subHooks": [],
                      "value": 0,
                    },
                  ],
                  "value": undefined,
                },
              ],
              "value": undefined,
            },
          ]
        `);
    });

    it('should support multiple inspectable values per custom hooks', () => {
      function useMultiLabelCustom() {
        React.useDebugValue('one');
        React.useDebugValue('two');
        React.useDebugValue('three');
        React.useState(0);
      }
      function useSingleLabelCustom(value) {
        React.useDebugValue(`single ${value}`);
        React.useState(0);
      }
      function Example() {
        useSingleLabelCustom('one');
        useMultiLabelCustom();
        useSingleLabelCustom('two');
        return null;
      }
      const renderer = ReactTestRenderer.create(<Example />);
      const childFiber = renderer.root.findByType(Example)._currentFiber();
      const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
      if (__DEV__) {
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "SingleLabelCustom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useSingleLabelCustom",
                    "lineNumber": 0,
                  },
                  "id": 0,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": "single one",
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "MultiLabelCustom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useMultiLabelCustom",
                    "lineNumber": 0,
                  },
                  "id": 1,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": [
                "one",
                "two",
                "three",
              ],
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "SingleLabelCustom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useSingleLabelCustom",
                    "lineNumber": 0,
                  },
                  "id": 2,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": "single two",
            },
          ]
        `);
      } else
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "SingleLabelCustom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useSingleLabelCustom",
                    "lineNumber": 0,
                  },
                  "id": 0,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": undefined,
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "MultiLabelCustom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useMultiLabelCustom",
                    "lineNumber": 0,
                  },
                  "id": 1,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": undefined,
            },
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "SingleLabelCustom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useSingleLabelCustom",
                    "lineNumber": 0,
                  },
                  "id": 2,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": undefined,
            },
          ]
        `);
    });

    it('should ignore useDebugValue() made outside of a custom hook', () => {
      function Example() {
        React.useDebugValue('this is invalid');
        return null;
      }
      const renderer = ReactTestRenderer.create(<Example />);
      const childFiber = renderer.root.findByType(Example)._currentFiber();
      const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
      expect(tree).toHaveLength(0);
    });

    it('should support an optional formatter function param', () => {
      function useCustom() {
        React.useDebugValue({bar: 123}, object => `bar:${object.bar}`);
        React.useState(0);
      }
      function Example() {
        useCustom();
        return null;
      }
      const renderer = ReactTestRenderer.create(<Example />);
      const childFiber = renderer.root.findByType(Example)._currentFiber();
      const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
      if (__DEV__) {
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "Custom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useCustom",
                    "lineNumber": 0,
                  },
                  "id": 0,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": "bar:123",
            },
          ]
        `);
      } else
        expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
          [
            {
              "debugInfo": null,
              "hookSource": {
                "columnNumber": 0,
                "fileName": "**",
                "functionName": "Example",
                "lineNumber": 0,
              },
              "id": null,
              "isStateEditable": false,
              "name": "Custom",
              "subHooks": [
                {
                  "debugInfo": null,
                  "hookSource": {
                    "columnNumber": 0,
                    "fileName": "**",
                    "functionName": "useCustom",
                    "lineNumber": 0,
                  },
                  "id": 0,
                  "isStateEditable": true,
                  "name": "State",
                  "subHooks": [],
                  "value": 0,
                },
              ],
              "value": undefined,
            },
          ]
        `);
    });
  });

  it('should support defaultProps and lazy', async () => {
    const Suspense = React.Suspense;

    function Foo(props) {
      const [value] = React.useState(props.defaultValue.slice(0, 3));
      return <div>{value}</div>;
    }
    Foo.defaultProps = {
      defaultValue: 'default',
    };

    async function fakeImport(result) {
      return {default: result};
    }

    const LazyFoo = React.lazy(() => fakeImport(Foo));

    const renderer = ReactTestRenderer.create(
      <Suspense fallback="Loading...">
        <LazyFoo />
      </Suspense>,
    );

    await expect(async () => {
      await act(async () => await LazyFoo);
    }).toErrorDev([
      'Foo: Support for defaultProps will be removed from function components in a future major release. Use JavaScript default parameters instead.',
    ]);

    const childFiber = renderer.root._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": "def",
        },
      ]
    `);
  });

  it('should support an injected dispatcher', () => {
    function Foo(props) {
      const [state] = React.useState('hello world');
      return <div>{state}</div>;
    }

    const initial = {};
    let current = initial;
    let getterCalls = 0;
    const setterCalls = [];
    const FakeDispatcherRef = {
      get current() {
        getterCalls++;
        return current;
      },
      set current(value) {
        setterCalls.push(value);
        current = value;
      },
    };

    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root._currentFiber();

    let didCatch = false;

    try {
      ReactDebugTools.inspectHooksOfFiber(childFiber, FakeDispatcherRef);
    } catch (error) {
      expect(error.message).toBe('Error rendering inspected component');
      expect(error.cause).toBeInstanceOf(Error);
      expect(error.cause.message).toBe(
        'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for' +
          ' one of the following reasons:\n' +
          '1. You might have mismatching versions of React and the renderer (such as React DOM)\n' +
          '2. You might be breaking the Rules of Hooks\n' +
          '3. You might have more than one copy of React in the same app\n' +
          'See https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.',
      );
      didCatch = true;
    }
    // avoid false positive if no error was thrown at all
    expect(didCatch).toBe(true);

    expect(getterCalls).toBe(1);
    expect(setterCalls).toHaveLength(2);
    expect(setterCalls[0]).not.toBe(initial);
    expect(setterCalls[1]).toBe(initial);
  });

  // This test case is based on an open source bug report:
  // https://github.com/facebookincubator/redux-react-hook/issues/34#issuecomment-466693787
  it('should properly advance the current hook for useContext', async () => {
    const MyContext = React.createContext(1);

    let incrementCount;

    function Foo(props) {
      const context = React.useContext(MyContext);
      const [data, setData] = React.useState({count: context});

      incrementCount = () => setData(({count}) => ({count: count + 1}));

      return <div>count: {data.count}</div>;
    }

    const renderer = ReactTestRenderer.create(<Foo />);
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['count: ', '1'],
    });

    await act(() => incrementCount());
    expect(renderer.toJSON()).toEqual({
      type: 'div',
      props: {},
      children: ['count: ', '2'],
    });

    const childFiber = renderer.root._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": null,
          "isStateEditable": false,
          "name": "Context",
          "subHooks": [],
          "value": 1,
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": true,
          "name": "State",
          "subHooks": [],
          "value": {
            "count": 2,
          },
        },
      ]
    `);
  });

  it('should support composite useSyncExternalStore hook', () => {
    const useSyncExternalStore = React.useSyncExternalStore;
    function Foo() {
      const value = useSyncExternalStore(
        () => () => {},
        () => 'snapshot',
      );
      React.useMemo(() => 'memo', []);
      React.useMemo(() => 'not used', []);
      return value;
    }

    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": null,
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": false,
          "name": "SyncExternalStore",
          "subHooks": [],
          "value": "snapshot",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "memo",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "not used",
        },
      ]
    `);
  });

  it('should support use(Context) hook', () => {
    const Context = React.createContext('default');
    function Foo() {
      const value = React.use(Context);
      React.useMemo(() => 'memo', []);
      React.useMemo(() => 'not used', []);

      return value;
    }

    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": null,
          "isStateEditable": false,
          "name": "Context",
          "subHooks": [],
          "value": "default",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "memo",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "not used",
        },
      ]
    `);
  });

  // @gate enableAsyncActions
  it('should support useOptimistic hook', () => {
    const useOptimistic = React.useOptimistic;
    function Foo() {
      const [value] = useOptimistic('abc', currentState => currentState);
      React.useMemo(() => 'memo', []);
      React.useMemo(() => 'not used', []);
      return value;
    }

    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": false,
          "name": "Optimistic",
          "subHooks": [],
          "value": "abc",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "memo",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "not used",
        },
      ]
    `);
  });

  // @gate enableFormActions && enableAsyncActions
  it('should support useFormState hook', () => {
    function Foo() {
      const [value] = ReactDOM.useFormState(function increment(n) {
        return n;
      }, 0);
      React.useMemo(() => 'memo', []);
      React.useMemo(() => 'not used', []);

      return value;
    }

    const renderer = ReactTestRenderer.create(<Foo />);
    const childFiber = renderer.root.findByType(Foo)._currentFiber();
    const tree = ReactDebugTools.inspectHooksOfFiber(childFiber);
    expect(normalizeSourceLoc(tree)).toMatchInlineSnapshot(`
      [
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 0,
          "isStateEditable": false,
          "name": "FormState",
          "subHooks": [],
          "value": 0,
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 1,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "memo",
        },
        {
          "debugInfo": null,
          "hookSource": {
            "columnNumber": 0,
            "fileName": "**",
            "functionName": "Foo",
            "lineNumber": 0,
          },
          "id": 2,
          "isStateEditable": false,
          "name": "Memo",
          "subHooks": [],
          "value": "not used",
        },
      ]
    `);
  });
});
