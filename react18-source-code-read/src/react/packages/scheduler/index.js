/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

export * from './src/forks/Scheduler';

// sy 添加以下
export {
  log,
  unstable_flushAllWithoutAsserting,
  unstable_flushNumberOfYields,
  unstable_flushExpired,
  unstable_flushUntilNextPaint,
  unstable_flushAll,
  unstable_advanceTime,
  unstable_setDisableYieldValue,
} from './src/forks/SchedulerMock';
