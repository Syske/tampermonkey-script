// ==UserScript==
// @name         Beisen Wiki Markdown Preview
// @namespace    https://wiki.beisen-inc.com/
// @version      1.1.0
// @description  Preview Beisen Wiki Markdown attachments in a new tab.
// @match        https://wiki.beisen-inc.com/*
// @require      https://cdn.jsdelivr.net/npm/marked@18.2.0/lib/marked.umd.js
// @require      https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const ATTACHMENT_PATH = '/download/attachments/';

  // Resolve libraries loaded by Tampermonkey.
  const markedLib =
    (typeof marked !== 'undefined' && marked) ||
    window.marked;

  const purifier =
    (typeof DOMPurify !== 'undefined' && DOMPurify) ||
    window.DOMPurify;

  if (!markedLib || !purifier) {
    console.error('[Wiki Markdown Preview] Libraries unavailable.');
    return;
  }

  markedLib.setOptions({
    gfm: true,
    breaks: false
  });

  function getAttachmentUrl(target) {
    if (!(target instanceof Element)) return null;

    const link = target.closest('a[href]');
    if (!link) return null;

    let url;
    try {
      url = new URL(link.href, location.href);
    } catch {
      return null;
    }

    if (url.origin !== location.origin) return null;
    if (!url.pathname.startsWith(ATTACHMENT_PATH)) return null;
    if (!/\.md$/i.test(url.pathname)) return null;

    return url;
  }

  function getFilename(url) {
    const name = url.pathname.split('/').pop() || 'preview.md';
    try {
      return decodeURIComponent(name);
    } catch {
      return name;
    }
  }

  function createPreviewTab(url, filename) {
    const tab = window.open('about:blank', '_blank');
    if (!tab) return null;

    tab.opener = null;

    const doc = tab.document;
    doc.open();
    doc.write(
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Markdown Preview</title></head><body></body></html>'
    );
    doc.close();

    doc.documentElement.style.height = '100%';
    doc.body.style.cssText =
      'margin:0;height:100%;font-family:Arial,sans-serif;' +
      'background:#f5f6f8;color:#24292f;';

    const bar = doc.createElement('div');
    bar.style.cssText = [
      'height:48px',
      'box-sizing:border-box',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'padding:0 20px',
      'background:#fff',
      'border-bottom:1px solid #ddd',
      'font-size:13px'
    ].join(';');

    const name = doc.createElement('span');
    name.textContent = filename;
    name.style.cssText =
      'flex:1;overflow:hidden;text-overflow:ellipsis;' +
      'white-space:nowrap;font-weight:600;';

    const status = doc.createElement('span');
    status.textContent = '正在读取附件…';
    status.style.color = '#888';

    const copy = doc.createElement('button');
    copy.textContent = '复制原文';
    copy.style.cssText =
      'padding:6px 12px;border:1px solid #ddd;' +
      'border-radius:5px;background:white;cursor:pointer;';

    const download = doc.createElement('a');
    download.textContent = '下载原文件';
    download.href = url.href;
    download.style.cssText =
      'color:#1677ff;text-decoration:none;white-space:nowrap;';

    const original = doc.createElement('a');
    original.textContent = '原始文件';
    original.href = url.href;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    original.style.cssText =
      'color:#1677ff;text-decoration:none;white-space:nowrap;';

    bar.append(name, status, copy, download, original);

    const content = doc.createElement('main');
    content.style.cssText = [
      'box-sizing:border-box',
      'max-width:1100px',
      'min-height:calc(100% - 48px)',
      'margin:0 auto',
      'padding:36px 48px',
      'background:#fff',
      'box-shadow:0 1px 5px rgba(0,0,0,.06)',
      'overflow-wrap:anywhere'
    ].join(';');

    const style = doc.createElement('style');
    style.textContent = `
      main {
        line-height: 1.75;
        font-size: 15px;
      }
      main h1, main h2 {
        padding-bottom: .3em;
        border-bottom: 1px solid #eaecef;
      }
      main h1 { font-size: 2em; }
      main h2 { font-size: 1.5em; }
      main h3 { font-size: 1.25em; }
      main a { color: #0969da; }
      main img { max-width: 100%; height: auto; }
      main table {
        border-collapse: collapse;
        width: 100%;
        display: block;
        overflow-x: auto;
      }
      main th, main td {
        border: 1px solid #d0d7de;
        padding: 7px 12px;
      }
      main th { background: #f6f8fa; }
      main tr:nth-child(even) { background: #f6f8fa; }
      main pre {
        padding: 16px;
        overflow-x: auto;
        background: #f6f8fa;
        border-radius: 6px;
      }
      main code {
        font-family: Consolas, monospace;
        background: #eff1f3;
        padding: 2px 4px;
        border-radius: 3px;
      }
      main pre code { background: transparent; padding: 0; }
      main blockquote {
        margin-left: 0;
        padding: 0 1em;
        color: #656d76;
        border-left: 4px solid #d0d7de;
      }
      main hr { border: 0; border-top: 1px solid #d8dee4; }
    `;

    doc.head.appendChild(style);
    doc.body.append(bar, content);

    let rawMarkdown = '';

    copy.addEventListener('click', async () => {
      try {
        await tab.navigator.clipboard.writeText(rawMarkdown);
        status.textContent = '已复制原文';
      } catch {
        status.textContent = '复制失败，请手动复制';
      }
    });

    return {
      tab,
      content,

      setRaw(value) {
        rawMarkdown = value;
      },

      setStatus(value) {
        status.textContent = value;
      },

      showError(message) {
        content.textContent = message;
        content.style.color = '#b42318';
      },

      showContent(markdown) {
        const rendered = markedLib.parse(markdown, {
          async: false,
          gfm: true
        });

        content.innerHTML = purifier.sanitize(rendered, {
          USE_PROFILES: { html: true }
        });

        // Resolve relative links and images against the original file.
        content.querySelectorAll('a[href], img[src]').forEach(el => {
          const attr = el.tagName === 'IMG' ? 'src' : 'href';
          const value = el.getAttribute(attr);

          if (!value) return;

          try {
            const resolved = new URL(value, url.href);

            if (resolved.protocol === 'http:' ||
                resolved.protocol === 'https:') {
              el.setAttribute(attr, resolved.href);
            } else {
              el.removeAttribute(attr);
            }
          } catch {
            el.removeAttribute(attr);
          }
        });

        content.querySelectorAll('a[href]').forEach(el => {
          el.target = '_blank';
          el.rel = 'noopener noreferrer';
        });

        this.setStatus('预览中');
      }
    };
  }

  async function loadAttachment(url, preview) {
    try {
      const response = await fetch(url.href, {
        method: 'GET',
        credentials: 'same-origin',
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText}`
        );
      }

      const markdown = await response.text();

      if (!markdown.trim()) {
        throw new Error('Markdown 内容为空。');
      }

      preview.setRaw(markdown);
      preview.showContent(markdown);

    } catch (error) {
      console.error('[Wiki Markdown Preview]', error);

      preview.setStatus('读取失败');
      preview.showError(
        '无法读取 Markdown 附件。\n\n' +
        '原因：' + (error.message || String(error)) +
        '\n\n请检查 Wiki 登录状态、附件权限和网络请求。'
      );
    }
  }

  document.addEventListener('click', function (event) {
    if (event.button !== 0) return;

    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    if (event.defaultPrevented) return;

    const url = getAttachmentUrl(event.target);
    if (!url) return;

    const filename = getFilename(url);
    const preview = createPreviewTab(url, filename);

    if (!preview) {
      console.warn('[Wiki Markdown Preview] Popup blocked.');
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    loadAttachment(url, preview);

  }, true);

  console.info('[Wiki Markdown Preview] v1.1.0 loaded');
})();
