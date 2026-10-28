# Tampermonkey Scripts

个人 Tampermonkey（油猴）用户脚本集合，用于解决日常开发中的各类小痛点。

> 每个脚本的详细说明（背景、功能、安装、自定义、原理）见 [doc/](./doc/) 目录下对应的文档。

## 脚本索引

| 脚本 | 说明 | 文档 |
| ---- | ---- | ---- |
| [cool-nexus-sql-preview.js](./scripts/cool-nexus-sql-preview.js) | 修复 Nexus 仓库中 `.sql` 文件的 UTF-8 乱码，支持 SQL 语法高亮与主题切换 | [doc/cool-nexus-sql-preview.md](./doc/cool-nexus-sql-preview.md) |

<!-- 新脚本请按上面的格式在表格中追加一行 -->

## 通用安装方式

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 打开 Tampermonkey 管理面板，新建脚本后粘贴对应脚本文件的内容并保存（或通过「实用工具」→「导入文件」导入）
3. 访问脚本 `@match` 匹配的页面即可生效

## 目录结构

```
.
├── README.md                        # 脚本索引（本文件）
├── doc/                             # 各脚本的详细说明文档
│   └── cool-nexus-sql-preview.md
├── scripts/                         # 脚本源码
│   └── cool-nexus-sql-preview.js
└── LICENSE
```

## 新增脚本

1. 将脚本 `.js` 文件放到 `scripts/` 目录
2. 在 `doc/` 下创建同名 `.md` 文档，建议包含：背景、功能、安装、自定义、工作原理
3. 在上面的「脚本索引」表格中追加一行

## 许可证

[MIT](./LICENSE)
