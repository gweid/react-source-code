/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @emails react-core
 */

'use strict';

// NOTE: We're explicitly not using JSX in this file. This is intended to test
// classic React.createElement without JSX.
// TODO: ^ the above note is a bit stale because there are tests in this file
// that do use JSX syntax. We should port them to React.createElement, and also
// confirm there's a corresponding test that uses JSX syntax.

let PropTypes;
let React;
let ReactDOMClient;
let act;

let ReactFeatureFlags = require('shared/ReactFeatureFlags');

describe('ReactElementValidator', () => {
  let ComponentClass;

  beforeEach(() => {
    jest.resetModules();

    PropTypes = require('prop-types');
    ReactFeatureFlags = require('shared/ReactFeatureFlags');
    ReactFeatureFlags.replayFailedUnitOfWorkWithInvokeGuardedCallback = false;
    React = require('react');
    ReactDOMClient = require('react-dom/client');
    act = require('internal-test-utils').act;
    ComponentClass = class extends React.Component {
      render() {
        return React.createElement('div');
      }
    };
  });

  it('warns for keys for arrays of elements in rest args', () => {
    expect(() => {
      React.createElement(ComponentClass, null, [
        React.createElement(ComponentClass),
        React.createElement(ComponentClass),
      ]);
    }).toErrorDev('Each child in a list should have a unique "key" prop.');
  });

  it('warns for keys for arrays of elements with owner info', async () => {
    class InnerClass extends React.Component {
      render() {
        return React.createElement(ComponentClass, null, this.props.childSet);
      }
    }

    class ComponentWrapper extends React.Component {
      render() {
        return React.createElement(InnerClass, {
          childSet: [
            React.createElement(ComponentClass),
            React.createElement(ComponentClass),
          ],
        });
      }
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => root.render(React.createElement(ComponentWrapper)));
    }).toErrorDev(
      'Each child in a list should have a unique "key" prop.' +
        '\n\nCheck the render method of `InnerClass`. ' +
        'It was passed a child from ComponentWrapper. ',
    );
  });

  it('warns for keys for arrays with no owner or parent info', async () => {
    function Anonymous() {
      return <div />;
    }
    Object.defineProperty(Anonymous, 'name', {value: undefined});

    const divs = [<div />, <div />];

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => root.render(<Anonymous>{divs}</Anonymous>));
    }).toErrorDev(
      'Warning: Each child in a list should have a unique ' +
        '"key" prop. See https://reactjs.org/link/warning-keys for more information.\n' +
        '    in div (at **)',
    );
  });

  it('warns for keys for arrays of elements with no owner info', async () => {
    const divs = [<div />, <div />];

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));

      await act(() => root.render(<div>{divs}</div>));
    }).toErrorDev(
      'Warning: Each child in a list should have a unique ' +
        '"key" prop.\n\nCheck the top-level render call using <div>. See ' +
        'https://reactjs.org/link/warning-keys for more information.\n' +
        '    in div (at **)',
    );
  });

  it('warns for keys with component stack info', async () => {
    function Component() {
      return <div>{[<div />, <div />]}</div>;
    }

    function Parent(props) {
      return React.cloneElement(props.child);
    }

    function GrandParent() {
      return <Parent child={<Component />} />;
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => root.render(<GrandParent />));
    }).toErrorDev(
      'Warning: Each child in a list should have a unique ' +
        '"key" prop.\n\nCheck the render method of `Component`. See ' +
        'https://reactjs.org/link/warning-keys for more information.\n' +
        '    in div (at **)\n' +
        '    in Component (at **)\n' +
        '    in Parent (at **)\n' +
        '    in GrandParent (at **)',
    );
  });

  it('does not warn for keys when passing children down', async () => {
    function Wrapper(props) {
      return (
        <div>
          {props.children}
          <footer />
        </div>
      );
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() =>
      root.render(
        <Wrapper>
          <span />
          <span />
        </Wrapper>,
      ),
    );
  });

  it('warns for keys for iterables of elements in rest args', () => {
    const iterable = {
      '@@iterator': function () {
        let i = 0;
        return {
          next: function () {
            const done = ++i > 2;
            return {
              value: done ? undefined : React.createElement(ComponentClass),
              done: done,
            };
          },
        };
      },
    };

    expect(() =>
      React.createElement(ComponentClass, null, iterable),
    ).toErrorDev('Each child in a list should have a unique "key" prop.');
  });

  it('does not warns for arrays of elements with keys', () => {
    React.createElement(ComponentClass, null, [
      React.createElement(ComponentClass, {key: '#1'}),
      React.createElement(ComponentClass, {key: '#2'}),
    ]);
  });

  it('does not warns for iterable elements with keys', () => {
    const iterable = {
      '@@iterator': function () {
        let i = 0;
        return {
          next: function () {
            const done = ++i > 2;
            return {
              value: done
                ? undefined
                : React.createElement(ComponentClass, {key: '#' + i}),
              done: done,
            };
          },
        };
      },
    };

    React.createElement(ComponentClass, null, iterable);
  });

  it('does not warn when the element is directly in rest args', () => {
    React.createElement(
      ComponentClass,
      null,
      React.createElement(ComponentClass),
      React.createElement(ComponentClass),
    );
  });

  it('does not warn when the array contains a non-element', () => {
    React.createElement(ComponentClass, null, [{}, {}]);
  });

  it('should give context for PropType errors in nested components.', async () => {
    // In this test, we're making sure that if a proptype error is found in a
    // component, we give a small hint as to which parent instantiated that
    // component as per warnings about key usage in ReactElementValidator.
    function MyComp(props) {
      return React.createElement('div', null, 'My color is ' + props.color);
    }
    MyComp.propTypes = {
      color: PropTypes.string,
    };
    function ParentComp() {
      return React.createElement(MyComp, {color: 123});
    }
    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => root.render(React.createElement(ParentComp)));
    }).toErrorDev(
      'Warning: Failed prop type: ' +
        'Invalid prop `color` of type `number` supplied to `MyComp`, ' +
        'expected `string`.\n' +
        '    in MyComp (at **)\n' +
        '    in ParentComp (at **)',
    );
  });

  it('gives a helpful error when passing invalid types', () => {
    function Foo() {}
    expect(() => {
      React.createElement(undefined);
      React.createElement(null);
      React.createElement(true);
      React.createElement({x: 17});
      React.createElement({});
      React.createElement(React.createElement('div'));
      React.createElement(React.createElement(Foo));
      React.createElement(React.createElement(React.createContext().Consumer));
      React.createElement({$$typeof: 'non-react-thing'});
    }).toErrorDev(
      [
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: undefined. You likely forgot to export your ' +
          "component from the file it's defined in, or you might have mixed up " +
          'default and named imports.',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: null.',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: boolean.',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: object.',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: object. You likely forgot to export your ' +
          "component from the file it's defined in, or you might have mixed up " +
          'default and named imports.',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: <div />. Did you accidentally export a JSX literal ' +
          'instead of a component?',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: <Foo />. Did you accidentally export a JSX literal ' +
          'instead of a component?',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: <Context.Consumer />. Did you accidentally ' +
          'export a JSX literal instead of a component?',
        'Warning: React.createElement: type is invalid -- expected a string ' +
          '(for built-in components) or a class/function (for composite ' +
          'components) but got: object.',
      ],
      {withoutStack: true},
    );

    // Should not log any additional warnings
    React.createElement('div');
  });

  it('includes the owner name when passing null, undefined, boolean, or number', async () => {
    function ParentComp() {
      return React.createElement(null);
    }

    await expect(async () => {
      await expect(async () => {
        const root = ReactDOMClient.createRoot(document.createElement('div'));
        await act(() => root.render(React.createElement(ParentComp)));
      }).rejects.toThrowError(
        'Element type is invalid: expected a string (for built-in components) ' +
          'or a class/function (for composite components) but got: null.' +
          (__DEV__ ? '\n\nCheck the render method of `ParentComp`.' : ''),
      );
    }).toErrorDev([
      'Warning: React.createElement: type is invalid -- expected a string ' +
        '(for built-in components) or a class/function (for composite ' +
        'components) but got: null.' +
        '\n\nCheck the render method of `ParentComp`.\n    in ParentComp',
      'Warning: React.createElement: type is invalid -- expected a string ' +
        '(for built-in components) or a class/function (for composite ' +
        'components) but got: null.' +
        '\n\nCheck the render method of `ParentComp`.\n    in ParentComp',
    ]);
  });

  it('should check default prop values', async () => {
    class Component extends React.Component {
      static propTypes = {prop: PropTypes.string.isRequired};
      static defaultProps = {prop: null};
      render() {
        return React.createElement('span', null, this.props.prop);
      }
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => root.render(React.createElement(Component)));
    }).toErrorDev(
      'Warning: Failed prop type: The prop `prop` is marked as required in ' +
        '`Component`, but its value is `null`.\n' +
        '    in Component',
    );
  });

  it('should not check the default for explicit null', async () => {
    class Component extends React.Component {
      static propTypes = {prop: PropTypes.string.isRequired};
      static defaultProps = {prop: 'text'};
      render() {
        return React.createElement('span', null, this.props.prop);
      }
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() =>
        root.render(React.createElement(Component, {prop: null})),
      );
    }).toErrorDev(
      'Warning: Failed prop type: The prop `prop` is marked as required in ' +
        '`Component`, but its value is `null`.\n' +
        '    in Component',
    );
  });

  it('should check declared prop types', async () => {
    class Component extends React.Component {
      static propTypes = {
        prop: PropTypes.string.isRequired,
      };
      render() {
        return React.createElement('span', null, this.props.prop);
      }
    }

    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await expect(async () => {
      await act(() => root.render(React.createElement(Component)));
      await act(() => root.render(React.createElement(Component, {prop: 42})));
    }).toErrorDev([
      'Warning: Failed prop type: ' +
        'The prop `prop` is marked as required in `Component`, but its value ' +
        'is `undefined`.\n' +
        '    in Component',
      'Warning: Failed prop type: ' +
        'Invalid prop `prop` of type `number` supplied to ' +
        '`Component`, expected `string`.\n' +
        '    in Component',
    ]);

    // Should not error for strings
    await act(() =>
      root.render(React.createElement(Component, {prop: 'string'})),
    );
  });

  it('should warn if a PropType creator is used as a PropType', async () => {
    class Component extends React.Component {
      static propTypes = {
        myProp: PropTypes.shape,
      };
      render() {
        return React.createElement('span', null, this.props.myProp.value);
      }
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() =>
        root.render(React.createElement(Component, {myProp: {value: 'hi'}})),
      );
    }).toErrorDev(
      'Warning: Component: type specification of prop `myProp` is invalid; ' +
        'the type checker function must return `null` or an `Error` but ' +
        'returned a function. You may have forgotten to pass an argument to ' +
        'the type checker creator (arrayOf, instanceOf, objectOf, oneOf, ' +
        'oneOfType, and shape all require an argument).',
    );
  });

  it('should warn if component declares PropTypes instead of propTypes', async () => {
    class MisspelledPropTypesComponent extends React.Component {
      static PropTypes = {
        prop: PropTypes.string,
      };
      render() {
        return React.createElement('span', null, this.props.prop);
      }
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() =>
        root.render(
          React.createElement(MisspelledPropTypesComponent, {prop: 'Hi'}),
        ),
      );
    }).toErrorDev(
      'Warning: Component MisspelledPropTypesComponent declared `PropTypes` ' +
        'instead of `propTypes`. Did you misspell the property assignment?',
      {withoutStack: true},
    );
  });

  it('warns for fragments with illegal attributes', async () => {
    class Foo extends React.Component {
      render() {
        return React.createElement(React.Fragment, {a: 1}, '123');
      }
    }

    await expect(async () => {
      const root = ReactDOMClient.createRoot(document.createElement('div'));
      await act(() => root.render(React.createElement(Foo)));
    }).toErrorDev(
      'Invalid prop `a` supplied to `React.Fragment`. React.Fragment ' +
        'can only have `key` and `children` props.',
    );
  });

  if (!__EXPERIMENTAL__) {
    it('should warn when accessing .type on an element factory', () => {
      function TestComponent() {
        return <div />;
      }

      let TestFactory;

      expect(() => {
        TestFactory = React.createFactory(TestComponent);
      }).toWarnDev(
        'Warning: React.createFactory() is deprecated and will be removed in a ' +
          'future major release. Consider using JSX or use React.createElement() ' +
          'directly instead.',
        {withoutStack: true},
      );

      expect(() => TestFactory.type).toWarnDev(
        'Warning: Factory.type is deprecated. Access the class directly before ' +
          'passing it to createFactory.',
        {withoutStack: true},
      );

      // Warn once, not again
      expect(TestFactory.type).toBe(TestComponent);
    });
  }

  it('does not warn when using DOM node as children', async () => {
    class DOMContainer extends React.Component {
      ref;
      render() {
        return <div ref={n => (this.ref = n)} />;
      }
      componentDidMount() {
        this.ref.appendChild(this.props.children);
      }
    }

    const node = document.createElement('div');
    const root = ReactDOMClient.createRoot(document.createElement('div'));
    await act(() => {
      // This shouldn't cause a stack overflow or any other problems (#3883)
      root.render(<DOMContainer>{node}</DOMContainer>);
    });
  });

  it('should not enumerate enumerable numbers (#4776)', () => {
    /*eslint-disable no-extend-native */
    Number.prototype['@@iterator'] = function () {
      throw new Error('number iterator called');
    };
    /*eslint-enable no-extend-native */

    try {
      void (
        <div>
          {5}
          {12}
          {13}
        </div>
      );
    } finally {
      delete Number.prototype['@@iterator'];
    }
  });

  it('does not blow up with inlined children', () => {
    // We don't suggest this since it silences all sorts of warnings, but we
    // shouldn't blow up either.

    const child = {
      $$typeof: (<div />).$$typeof,
      type: 'span',
      key: null,
      ref: null,
      props: {},
      _owner: null,
    };

    void (<div>{[child]}</div>);
  });

  it('does not blow up on key warning with undefined type', () => {
    const Foo = undefined;
    expect(() => {
      void (<Foo>{[<div />]}</Foo>);
    }).toErrorDev(
      'Warning: React.jsx: type is invalid -- expected a string ' +
        '(for built-in components) or a class/function (for composite ' +
        'components) but got: undefined. You likely forgot to export your ' +
        "component from the file it's defined in, or you might have mixed up " +
        'default and named imports.\n\nCheck your code at **.',
      {withoutStack: true},
    );
  });

  it('does not call lazy initializers eagerly', () => {
    let didCall = false;
    const Lazy = React.lazy(() => {
      didCall = true;
      return {then() {}};
    });
    React.createElement(Lazy);
    expect(didCall).toBe(false);
  });

  it('__self and __source are treated as normal props', async () => {
    // These used to be reserved props because the classic React.createElement
    // runtime passed this data as props, whereas the jsxDEV() runtime passes
    // them as separate arguments.
    function Child({__self, __source}) {
      return __self + __source;
    }

    const container = document.createElement('div');
    const root = ReactDOMClient.createRoot(container);
    // NOTE: The Babel transform treats the presence of these props as a syntax
    // error but theoretically it doesn't have to. Using spread here to
    // circumvent the syntax error and demonstrate that the runtime
    // doesn't care.
    const props = {
      __self: 'Hello ',
      __source: 'world!',
    };
    await act(() => root.render(<Child {...props} />));
    expect(container.textContent).toBe('Hello world!');
  });
});
