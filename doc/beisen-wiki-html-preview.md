# beisen-wiki-html-preview.js

在 Beisen Wiki 中直接在线预览 HTML 附件，并让附件的 JavaScript 在隔离的沙箱中执行。

## 背景

Beisen Wiki 上的 `.html` / `.htm` 附件点击后只能下载到本地再打开，无法在线查看；如果为了让附件在页面上直接跑起来而把它的 HTML 注入当前页面，附件的脚本又会拿到与 Wiki 完全相同的权限（可读 Cookie、DOM、localStorage），风险很高。

本脚本把附件内容交给一个 `sandbox="allow-scripts"` 的 iframe 渲染：脚本能正常执行，但运行在不透明源（opaque origin）中，拿不到 Wiki 的任何同源权限。

## 功能

- ✅ **点击即预览**：在 Wiki 页面点击 HTML 附件链接，新标签页打开预览，不再触发下载
- ✅ **沙箱执行**：iframe 仅授予 `allow-scripts`（不给 `allow-same-origin`），附件脚本与 Wiki 页面严格隔离
- ✅ **资源可解析**：注入 `<base href="附件地址">`，附件中的相对 CSS/JS/图片仍按原路径加载
- ✅ **防篡改基址**：渲染前移除附件自带的 `<base>` 标签，避免附件重定向资源基址
- ✅ **顶部工具栏**：显示文件名与加载状态，并提供「下载原文件」「原始附件」入口
- ✅ **失败可诊断**：HTTP 状态码异常、内容为空、登录态失效 / 附件无权限时给出明确错误文案
- ✅ **不劫持常规操作**：Ctrl / Cmd / Shift / Alt 点击与鼠标中键保持浏览器默认行为（新窗口 / 新标签 / 下载）

## 安全说明

| 措施 | 作用 |
| ---- | ---- |
| `sandbox="allow-scripts"`（不含 `allow-same-origin`） | 附件脚本无法访问 Wiki 的 Cookie、DOM、localStorage，无法发起同源特权请求 |
| 移除附件自带 `<base>` 后注入受控 `<base>` | 防止附件把相对资源指向第三方地址 |
| `referrerPolicy="no-referrer"` | 预览时不向外部资源泄露 Wiki 页面地址 |
| `tab.opener = null` | 预览标签页无法通过 `window.opener` 反控 Wiki 页面 |
| 仅处理同源 `/download/attachments/` 下的 `.html` / `.htm` 链接 | 不接管站内普通跳转与站外链接 |

> 预览本身的取数使用页面登录态（`fetch` + `credentials: 'same-origin'`），因此仅能看到当前账号本来就有权限访问的附件。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 打开 Tampermonkey 管理面板 → 「实用工具」→「导入文件」，或新建脚本后将 [`scripts/beisen-wiki-html-preview.js`](../scripts/beisen-wiki-html-preview.js) 的内容粘贴保存
3. 访问 Beisen Wiki 上的任意页面，点击 `.html` 附件链接即可

## 自定义

- **匹配站点**：修改脚本头部元信息中的 `@match` 规则：

  ```js
  // @match        https://your-wiki.example.com/*
  ```

- **附件路径**：修改 `ATTACHMENT_PATH` 常量（默认 `/download/attachments/`）
- **执行策略**：若希望预览完全静态（附件脚本不执行），把 `frame.setAttribute('sandbox', 'allow-scripts')` 中的参数改为空字符串
- **工具栏样式**：调整 `bar` / `name` / `status` 等元素的 `style.cssText`

## 工作原理

1. 在 `document-idle` 时机注入，以捕获阶段（`capture: true`）监听 `document` 的 `click`
2. 命中「同源 + 路径以 `/download/attachments/` 开头 + 以 `.html` / `.htm` 结尾」的链接时，先**同步** `window.open('about:blank', '_blank')`，避免被弹窗拦截
3. 在新标签页中通过 `document.write` 构建外壳：顶部工具栏 + 预览 iframe
4. `fetch` 以 `credentials: 'same-origin'` 拉取附件 HTML 原文
5. 用 `DOMParser` 解析后移除原有 `<base>`、注入受控 `<base>`，再写入 `iframe.srcdoc`
6. 沙箱 iframe 渲染并执行附件脚本，完成后工具栏状态更新为「预览中」

## 已知限制

- 只处理同源 `/download/attachments/` 路径下的 `.html` / `.htm` 链接，其他位置的附件链接不生效
- 沙箱不含 `allow-same-origin`，附件若强依赖同源能力（读取自身 Cookie、`localStorage`、与父页面通信等）会行为异常，这是刻意的安全取舍
- 附件内容的编码由服务端响应头决定，Wiki 未声明编码时可能出现中文乱码（本脚本不强制 UTF-8 解码）
