# beisen-wiki-markdown-preview.js

在 Beisen Wiki 中直接在线预览 Markdown 附件，以 GitHub 风格排版渲染，并做 XSS 消毒。

## 背景

Beisen Wiki 上的 `.md` 附件点击后只能下载，无法在线阅读；而 Markdown 渲染如果直接 `innerHTML` 塞入页面，附件里的原始 HTML 可能带来 XSS 风险。

本脚本在预览标签页中先用 [marked](https://marked.js.org/) 渲染、再用 [DOMPurify](https://github.com/cure53/DOMPurify) 消毒，最后才写入 DOM，兼顾阅读体验与安全。

## 功能

- ✅ **点击即预览**：在 Wiki 页面点击 `.md` 附件链接，新标签页打开预览，不再触发下载
- ✅ **标准 Markdown 渲染**：基于 marked（GFM：表格、任务列表、围栏代码块、自动链接等）
- ✅ **XSS 消毒**：DOMPurify 以 `USE_PROFILES: { html: true }` 白名单过滤渲染结果
- ✅ **相对链接可用**：附件中的相对图片 / 链接按原附件地址解析为绝对地址；非 `http(s)` 协议（如 `javascript:`）直接剔除
- ✅ **外链安全打开**：渲染出的链接统一 `target="_blank"` + `rel="noopener noreferrer"`
- ✅ **顶部工具栏**：文件名、加载状态、「复制原文」、「下载原文件」、「原始文件」
- ✅ **GitHub 风格排版**：标题分隔线、表格斑马纹与横向滚动、代码块底色、引用条、图片自适应宽度
- ✅ **不劫持常规操作**：Ctrl / Cmd / Shift / Alt 点击与鼠标中键保持浏览器默认行为

## 依赖

| 库 | 版本 | 来源 | 用途 |
| -- | ---- | ---- | ---- |
| [marked](https://www.npmjs.com/package/marked) | 18.2.0 | jsDelivr CDN（`@require`） | Markdown → HTML |
| [DOMPurify](https://www.npmjs.com/package/dompurify) | 3.2.6 | jsDelivr CDN（`@require`） | HTML 消毒 |

> 两个库由 Tampermonkey 的 `@require` 在脚本注入前加载，脚本内部对 `marked` / `DOMPurify` 做了双路径取值（模块作用域 + `window`），任一取不到就打印错误并静默退出。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 打开 Tampermonkey 管理面板 → 「实用工具」→「导入文件」，或新建脚本后将 [`scripts/beisen-wiki-markdown-preview.js`](../scripts/beisen-wiki-markdown-preview.js) 的内容粘贴保存
3. 访问 Beisen Wiki 上的任意页面，点击 `.md` 附件链接即可

## 自定义

- **匹配站点**：修改脚本头部元信息中的 `@match` 规则：

  ```js
  // @match        https://your-wiki.example.com/*
  ```

- **附件路径**：修改 `ATTACHMENT_PATH` 常量（默认 `/download/attachments/`）
- **Markdown 行为**：调整 `markedLib.setOptions({ gfm: true, breaks: false })`，例如把 `breaks` 改为 `true` 让单个换行也折行
- **排版样式**：修改 `style.textContent` 中的内联样式（限定在 `main` 作用域，不影响 Wiki 页面）

## 工作原理

1. 在 `document-idle` 时机注入，以捕获阶段（`capture: true`）监听 `document` 的 `click`
2. 命中「同源 + 路径以 `/download/attachments/` 开头 + 以 `.md` 结尾」的链接时，先**同步** `window.open('about:blank', '_blank')`，避免被弹窗拦截
3. 在新标签页中通过 `document.write` 构建外壳：顶部工具栏 + `<main>` 内容区 + 内联样式
4. `fetch` 以 `credentials: 'same-origin'` 拉取 Markdown 原文，并缓存原文用于「复制原文」
5. `markedLib.parse()` 渲染后交给 `purifier.sanitize()` 消毒，再写入 `content.innerHTML`
6. 遍历 `a[href]` / `img[src]`，以 `new URL(value, url.href)` 解析为绝对地址；非 `http(s)` 协议移除该属性

## 安全说明

- 渲染结果先经 DOMPurify 白名单过滤（`USE_PROFILES: { html: true }`）才进入 DOM，附件的原始 HTML / 事件属性 / `javascript:` 链接会被剥离
- 相对地址解析后只保留 `http:` / `https:`，其余协议（`javascript:`、`data:` 等）直接从元素上移除该属性
- `tab.opener = null`，预览标签页无法通过 `window.opener` 反控 Wiki 页面
- 链接统一附带 `rel="noopener noreferrer"`，避免被打开页面反向操控

## 已知限制

- 只处理同源 `/download/attachments/` 路径下的 `.md` 链接，其他位置的附件链接不生效
- 依赖 CDN 可达：若内网环境无法访问 `cdn.jsdelivr.net`，脚本会打印 `Libraries unavailable.` 并退出（可改为内网地址或把库文件随 `@require` 本地化）
- 解析为同步模式（`async: false`），不支持 marked 的异步扩展
- 图片若指向需要额外鉴权的第三方地址，可能因缺少凭据而加载失败
