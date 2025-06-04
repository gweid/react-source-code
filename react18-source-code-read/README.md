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



