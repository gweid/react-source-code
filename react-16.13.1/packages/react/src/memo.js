/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {REACT_MEMO_TYPE} from 'shared/ReactSymbols';

import isValidElementType from 'shared/isValidElementType';

// React.memo
export default function memo<Props>(
  type: React$ElementType,
  compare?: (oldProps: Props, newProps: Props) => boolean,
) {
  if (__DEV__) {
    if (!isValidElementType(type)) {
      console.error(
        'memo: The first argument must be a component. Instead ' +
          'received: %s',
        type === null ? 'null' : typeof type,
      );
    }
  }
  // 返回一个对象，这个对象有一些标记属性，对象带有一些标志属性，在react Fiber的过程中会做相应的处理（react-reconciler/ReactFiberBeginWork.js）
  return {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare,
  };
}
