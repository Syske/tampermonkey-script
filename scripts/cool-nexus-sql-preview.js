// ==UserScript==
// @name         修复 Nexus SQL 文件 UTF-8 显示
// @namespace    https://greasyfork.org/users/your-username
// @version      1.3
// @description  解决 Nexus 仓库中 .sql 文件乱码，支持 SQL 语法高亮与主题切换，并记住用户选择
// @author       Syske
// @match        https://oneops-plus-nexus-yqh.beisen-inc.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    const url = window.location.href;
    if (!url.endsWith('.sql')) return;

    const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/';
    const THEMES = [
        ['GitHub', 'github.min.css'],
        ['GitHub Dark', 'github-dark.min.css'],
        ['Atom One Light', 'atom-one-light.min.css'],
        ['Atom One Dark', 'atom-one-dark.min.css'],
        ['Monokai', 'monokai.min.css'],
        ['VS2015', 'vs2015.min.css'],
        ['Xcode', 'xcode.min.css'],
    ];
    const DEFAULT_THEME = 'github.min.css';
    const STORAGE_KEY = 'sql-hljs-theme';

    // 读取用户上次选择，没有则用默认
    function getSavedTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
        } catch (e) {
            return DEFAULT_THEME;
        }
    }

    // 切换主题并保存
    function setTheme(file, save) {
        let link = document.getElementById('hljs-theme');
        if (!link) {
            link = document.createElement('link');
            link.id = 'hljs-theme';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = CDN + 'styles/' + file;
        if (save) {
            try { localStorage.setItem(STORAGE_KEY, file); } catch (e) {}
        }
    }

    // 加载 highlight.js
    function loadScript(src) {
        return new Promise((res, rej) => {
            if (window.hljs) return res();
            const s = document.createElement('script');
            s.src = src;
            s.onload = res;
            s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    // 主流程
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer',
        onload: async function(res) {
            if (res.status !== 200) {
                console.error('[SQL UTF-8 Fix] 获取文件失败，状态码:', res.status);
                return;
            }

            const text = new TextDecoder('utf-8').decode(res.response);
            const currentTheme = getSavedTheme();
            setTheme(currentTheme, false);

            // 重建页面
            document.body.innerHTML = '';
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = 'language-sql';
            code.textContent = text;
            pre.appendChild(code);
            pre.style.margin = '0';
            pre.style.padding = '1em';
            document.body.appendChild(pre);

            // 高亮
            try {
                await loadScript(CDN + 'highlight.min.js');
                hljs.highlightElement(code);
            } catch (e) {
                console.warn('[SQL UTF-8 Fix] 高亮库加载失败，仅显示纯文本:', e.message);
            }

            // 主题下拉框
            const box = document.createElement('div');
            box.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:rgba(0,0,0,0.7);color:#fff;padding:6px 10px;border-radius:6px;font-size:13px;font-family:sans-serif;';

            const select = document.createElement('select');
            select.style.cssText = 'font-size:13px;padding:2px 4px;border-radius:4px;';
            THEMES.forEach(([name, file]) => {
                const opt = document.createElement('option');
                opt.value = file;
                opt.textContent = name;
                if (file === currentTheme) opt.selected = true;
                select.appendChild(opt);
            });
            select.onchange = () => setTheme(select.value, true);

            box.appendChild(select);
            document.body.appendChild(box);

            console.log('[SQL UTF-8 Fix] ✅ 修复 + 高亮完成，当前主题:', currentTheme);
        },
        onerror: function(err) {
            console.error('[SQL UTF-8 Fix] 请求出错:', err);
        }
    });
})();