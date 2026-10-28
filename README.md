# Tampermonkey Scripts

个人 Tampermonkey（油猴）用户脚本集合，用于解决日常开发中的各类小痛点。

## 脚本列表

| 脚本 | 说明 |
| ---- | ---- |
| [cool-nexus-sql-preview.js](./cool-nexus-sql-preview.js) | 修复 Nexus 仓库中 `.sql` 文件的 UTF-8 乱码，支持 SQL 语法高亮与主题切换 |

## cool-nexus-sql-preview.js

### 背景

在 Nexus 私服上直接浏览 `.sql` 文件时，页面会以错误的编码展示内容，导致中文注释全部乱码，且没有任何语法高亮，阅读体验很差。

本脚本通过 `GM_xmlhttpRequest` 以 `arraybuffer` 方式重新获取文件内容，使用 `TextDecoder` 强制按 UTF-8 解码，再重建页面进行渲染，从根源上解决乱码问题。

### 功能

- ✅ **修复乱码**：以二进制方式拉取文件，强制 UTF-8 解码，中文注释不再乱码
- ✅ **SQL 语法高亮**：基于 [highlight.js 11](https://highlightjs.org/)（CDN 加载，无需本地安装）
- ✅ **主题切换**：右上角下拉框一键切换 7 种高亮主题
- ✅ **记住选择**：主题偏好保存在 `localStorage`，下次打开自动应用
- ✅ **优雅降级**：高亮库加载失败时仍可正常查看纯文本

### 支持的主题

| 主题 | 风格 |
| ---- | ---- |
| GitHub | 浅色 |
| GitHub Dark | 深色 |
| Atom One Light | 浅色 |
| Atom One Dark | 深色 |
| Monokai | 深色 |
| VS2015 | 深色 |
| Xcode | 浅色 |

### 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 打开 Tampermonkey 管理面板 → 「实用工具」→「导入文件」，或新建脚本后将 `cool-nexus-sql-preview.js` 的内容粘贴保存
3. 访问 Nexus 上的任意 `.sql` 文件页面即可生效

### 自定义

- **匹配站点**：修改脚本头部元信息中的 `@match` 规则，即可适配其他 Nexus 实例：

  ```js
  // @match        https://your-nexus.example.com/*
  ```

- **默认主题**：修改脚本中的 `DEFAULT_THEME` 常量
- **更多主题**：向 `THEMES` 数组中追加 `[名称, 文件名]`，样式文件来自 highlight.js 官方 CDN

### 工作原理

1. 脚本在 `document-end` 时机注入，判断当前 URL 是否以 `.sql` 结尾
2. 通过 `GM_xmlhttpRequest`（`responseType: arraybuffer`）绕过页面默认编码重新获取文件
3. `TextDecoder('utf-8')` 解码为文本，清空原页面并重建 `<pre><code class="language-sql">` 结构
4. 动态加载 highlight.js 执行 `highlightElement` 完成高亮
5. 注入右上角悬浮主题选择器，切换结果写入 `localStorage`（key: `sql-hljs-theme`）

## 许可证

[MIT](./LICENSE)
