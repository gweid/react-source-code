/**
 * 二进制，高效存储与运算​​，能包含更多信息
 * 比如下面的 Placement | Update，结果就是：0b00000000000000000000000110，这反推回去就是 Placement | Update
 * 这使得一个字段就能够表示多种状态
 * 
 * 
 * 使用二进制位掩码的核心目的是：
 *  - 高效性​
 *    - 快速合并与检查，通过 |= 可以快速合并标记
 *    - 低内存占用
 *  - 便于条件判断​，通过 ​​按位与（&）​​ 可以快速检查某个标记是否存在
 *    - if (subtreeFlags & Placement)
 *  - ​灵活的状态组合​​：一个变量可表示多种副作用
 */
export const NoFlags = /*          */ 0b00000000000000000000000000 // 标识位：无
export const Placement = /*        */ 0b00000000000000000000000010 // 标识位：插入
export const Update = /*           */ 0b00000000000000000000000100 // 标识位：更新
export const ChildDeletion = /*    */ 0b00000000000000000000010000 // 标识位：删除子节点
export const Passive = /*          */ 0b00000000000000100000000000 // 标识位：副作用
export const MutationMask = Placement | Update                     // 插入或者更新，变更标识位掩码
export const LayoutMask = Update                                   // 更新，变更标识位掩码