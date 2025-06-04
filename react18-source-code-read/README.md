# react 源码阅读



## 启动调试



进入项目 `react18-source-code-read` 根目录

```shell
cd react18-source-code-read
```



安装包：

```shell
yarn
```



启动：

```shell
yarn start
```



## 目录结构

```
react18-source-code-read/
  ├── config                            // 工程化配置
  ├── scripts                           // 工程化配置
  ├── src                               // 子包目录
  │   ├── react                         // react 源码
  │   ├── components                    // 调试代码（组件）
  │   ├── pages                         // 调试代码（页面）
  │   ├── store                         // 调试代码（redux）
  │   └── index.js                      // 调试代码（入口文件）
```



## react 18 源码核心文件

![](../imgs/img1.jpg)



## VSCode 辅助插件

安装几个 vscode 插件，辅助阅读源码

- Bookmarks：打书签，可以多个文件快速跳转

- Better Comments：注释添加高亮颜色



## 初始化渲染



## 事件系统



## Context



## Hooks



## 调度器



### 合作式调度 & 抢占式调度器

react 中任务调度器场景分为：合作式调度器＆抢占式调度器

在浏览器环境中，合作式调度器（Cooperative Scheduler），是一种调度机制，用于管理和分配任务的执行

传统的抢占式调度器（Preemptive Scheduler）虽然CPU 利用率比较高，但是容易出现“饿死现象”。（对于饿死现象，常见解决办法是刷期检查，对于长时间没法得到处理的低优先级任务，即快要饿死的任务，提高它们的优先级，以此避免任务饿死。React 也是采用的这种方案

与传统的抢占式调度器不同，合作式调度器（Cooperative Scheduler） 依赖于任务主动释放执行权，而不是由 scheduler 强制中断任务

在合作式调度器（Cooperative Scheduler） 中，**每个任务负责自己的执行，并在适当的时机将执行权交还给scheduler。这种方式可以避免长时间运行的任务阻塞其它任务的执行，提高整体的响应性和性能**

合作式调度器（Cooperative Scheduler） 在处理1O操作、事件处理等场景下非常有用，可以避免阻塞浏览器的主线程，提升用户体验



### 如何避免饿死

react 中用到两种方案避免任务 “饿死”



#### 时间切片

时间切片，time slices，即划分时间段，避免某些任务长期占着主线程导致其它高优先级任务无法得到立即处理。

这种方式可以避免长时间运行的任务阻塞其它任务的执行，提高整体的响应性和性能。

> packages/scheduler/src/forks/Scheduler.js 中是合作式调度，就是使用的时间切片的方式



#### aging 策略


对于长时间没法得到处理的低优先级任务，即快要饿死的任务，是高它们的优先级，以此避免任务饿死



> packages/react-reconciler/src/ReactFiberLane.js

这里面的 markStarvedLanesAsExpired 函数用于把饿死任务标记为过期，相当于上文提到的提高优先级，以使之得到尽快的完成

这里具体的做法是，遍历待处理的任务，即遍历 lanes，检查它们是否过期。如果已经过期，就认为该任务处于即将饿死的状态，然后标记为已经过期，以强制它的完成



## Lane 模型


