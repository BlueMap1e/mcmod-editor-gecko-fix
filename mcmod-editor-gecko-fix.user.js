// ==UserScript==
// @name         MCMod Editor Gecko Scroll Fix
// @name:zh-CN   MC百科编辑器 Gecko 内核防跳顶补丁
// @namespace    https://github.com/BlueMap1e/mcmod-editor-gecko-fix
// @version      1.0.0
// @description  Fixes the legacy UEditor scroll-to-top glitch when inserting links/images on MCMod.cn under Gecko-based browsers (Firefox, Zen Browser, Floorp, etc.).
// @description:zh-CN 修复 Firefox / Zen Browser 等 Gecko 内核浏览器在 MC百科 (MCMod.cn) 编辑器中插入链接、图片或执行指令时，编辑框内部滚动条自动跳回顶部的历史兼容性问题。
// @author       BlueMap1e
// @match        *://*.mcmod.cn/*
// @run-at       document-end
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    /**
     * MCMod.cn 采用百度 UEditor 作为富文本编辑器。
     * 在 Gecko (Firefox / Zen) 内核下，由于 UEditor 历史特判代码中存在 `me.body.focus()` 以及弹窗失焦后
     * 光标坐标计算重置为 0 的问题，导致向编辑框插入超链接或图片时，内层 iframe (ueditor_0) 的滚动条会被强制重置到 (0, 0)。
     *
     * 本补丁通过挂载 UEditor 原生事件流，为内层 iframe 的滚动条提供无感的位置锁定与自动复位保护。
     */

    function patchUEditorInstance(editor) {
        if (!editor || editor._geckoScrollFixed) return;
        editor._geckoScrollFixed = true;

        let lastEditorScrollY = 0;

        // 获取编辑框内部真实有效的垂直滚动距离
        function getInnerScrollY() {
            if (!editor.document) return 0;
            const doc = editor.document;
            const win = editor.window;
            return (win ? win.scrollY : 0) ||
                   (doc.documentElement ? doc.documentElement.scrollTop : 0) ||
                   (doc.body ? doc.body.scrollTop : 0) || 0;
        }

        // 将内部视口精准拉回原位
        function restoreScrollPosition() {
            if (lastEditorScrollY <= 20) return;
            const doc = editor.document;
            const win = editor.window;
            if (win && win.scrollTo) win.scrollTo(0, lastEditorScrollY);
            if (doc && doc.documentElement) doc.documentElement.scrollTop = lastEditorScrollY;
            if (doc && doc.body) doc.body.scrollTop = lastEditorScrollY;
        }

        // 当编辑框准备就绪时加固 iframe 内部
        function setupIframeGuards() {
            const iWin = editor.window;
            const iDoc = editor.document;
            if (!iWin || !iDoc) return;

            // 1. 持续跟踪用户编辑时的真实滚动高度
            iWin.addEventListener('scroll', function () {
                const cur = getInnerScrollY();
                if (cur > 0) {
                    lastEditorScrollY = cur;
                }
            }, { passive: true });

            // 2. 拦截 iframe 内部由于 body.focus() 触发的视口对齐顶部
            if (iDoc.body) {
                const origBodyFocus = iDoc.body.focus;
                iDoc.body.focus = function (opts) {
                    return origBodyFocus.call(this, { preventScroll: true, ...(opts || {}) });
                };
            }

            // 3. 拦截 iframe 内部代码发起的异常 scrollTo(0, 0)
            const origIframeScrollTo = iWin.scrollTo;
            iWin.scrollTo = function (...args) {
                let targetY = typeof args[0] === 'object' ? args[0]?.top : args[1];
                if (targetY === 0 && lastEditorScrollY > 20) {
                    return;
                }
                return origIframeScrollTo.apply(this, args);
            };
        }

        if (editor.isReady) {
            setupIframeGuards();
        } else {
            editor.addListener('ready', setupIframeGuards);
        }

        // 4. 命令执行前（如点击弹窗确定前）锁定当前高度
        editor.addListener('beforeexeccommand', function () {
            const cur = getInnerScrollY();
            if (cur > 0) lastEditorScrollY = cur;
        });

        // 5. 命令执行完成或弹窗关闭后，级联触发复位锁（防异步动画覆盖）
        function triggerCascadeLock() {
            restoreScrollPosition();
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(restoreScrollPosition);
            }
            setTimeout(restoreScrollPosition, 20);
            setTimeout(restoreScrollPosition, 100);
            setTimeout(restoreScrollPosition, 300);
        }

        editor.addListener('afterexeccommand', triggerCascadeLock);
        editor.addListener('afterdialogclose', triggerCascadeLock);
    }

    // 轮询并捕获页面已初始化或动态生成的 UE 实例
    let attempts = 0;
    const intervalId = setInterval(function () {
        attempts++;
        if (window.UE && window.UE.instants) {
            for (let id in window.UE.instants) {
                patchUEditorInstance(window.UE.instants[id]);
            }
        }
        if (attempts > 50) {
            clearInterval(intervalId);
        }
    }, 400);

    // 劫持未来通过 UE.getEditor 创建的新实例
    if (window.UE) {
        const origGetEditor = window.UE.getEditor;
        window.UE.getEditor = function (...args) {
            const editor = origGetEditor.apply(this, args);
            patchUEditorInstance(editor);
            return editor;
        };
    }
})();
