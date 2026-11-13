// ==UserScript==
// @name         Beisen Wiki HTML Preview
// @namespace    https://wiki.beisen-inc.com/
// @version      1.1.0
// @description  Preview Beisen Wiki HTML attachments with isolated JavaScript execution.
// @match        https://wiki.beisen-inc.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const ATTACHMENT_PATH = '/download/attachments/';

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
    if (!/\.html?$/i.test(url.pathname)) return null;

    return url;
  }

  function getFilename(url) {
    const name = url.pathname.split('/').pop() || 'preview.html';
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
      '<title>HTML Preview</title></head><body></body></html>'
    );
    doc.close();

    doc.documentElement.style.height = '100%';
    doc.body.style.cssText =
      'margin:0;height:100%;font-family:Arial,sans-serif;background:#f5f6f8;';

    const bar = doc.createElement('div');
    bar.style.cssText = [
      'height:48px',
      'box-sizing:border-box',
      'display:flex',
      'align-items:center',
      'gap:12px',
      'padding:0 16px',
      'background:#fff',
      'border-bottom:1px solid #ddd',
      'color:#333',
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

    const download = doc.createElement('a');
    download.textContent = '下载原文件';
    download.href = url.href;
    download.style.cssText =
      'color:#1677ff;text-decoration:none;white-space:nowrap;';

    const original = doc.createElement('a');
    original.textContent = '原始附件';
    original.href = url.href;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    original.style.cssText =
      'color:#1677ff;text-decoration:none;white-space:nowrap;';

    bar.append(name, status, download, original);

    const frame = doc.createElement('iframe');
    frame.title = 'HTML attachment preview';

    // Allow JavaScript, but do not grant same-origin privileges.
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.referrerPolicy = 'no-referrer';

    frame.style.cssText =
      'display:block;width:100%;height:calc(100% - 48px);' +
      'border:0;background:white;';

    doc.body.append(bar, frame);

    return {
      tab,
      frame,

      setStatus(value) {
        status.textContent = value;
      },

      showError(message) {
        const error = doc.createElement('div');
        error.style.cssText =
          'padding:32px;color:#b42318;' +
          'font:14px/1.8 Arial,sans-serif;white-space:pre-wrap;';
        error.textContent = message;
        frame.replaceWith(error);
      },

      showContent(html) {
        const parsed = new DOMParser().parseFromString(
          html,
          'text/html'
        );

        // Prevent an attachment from overriding the resource base.
        parsed.querySelectorAll('base').forEach(el => el.remove());

        const base = parsed.createElement('base');
        base.href = url.href;
        parsed.head.prepend(base);

        frame.srcdoc =
          '<!doctype html>\n' +
          parsed.documentElement.outerHTML;

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

      const html = await response.text();

      if (!html.trim()) {
        throw new Error('附件内容为空。');
      }

      preview.showContent(html);

    } catch (error) {
      console.error('[Wiki HTML Preview]', error);

      preview.setStatus('读取失败');
      preview.showError(
        '无法读取 HTML 附件。\n\n' +
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

    // Open synchronously to avoid popup blocking.
    const preview = createPreviewTab(url, filename);

    if (!preview) {
      console.warn(
        '[Wiki HTML Preview] Popup blocked.'
      );
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    loadAttachment(url, preview);

  }, true);

  console.info('[Wiki HTML Preview] v1.1.0 loaded');
})();
