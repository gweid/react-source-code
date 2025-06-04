/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

// TODO: Use symbols?
export const NoPriority = 0; // 无优先级
export const ImmediatePriority = 1; // 立即执行优先级
export const UserBlockingPriority = 2; // 用户阻塞优先级
export const NormalPriority = 3; // 正常优先级
export const LowPriority = 4; // 低优先级
export const IdlePriority = 5; // 空闲优先级
