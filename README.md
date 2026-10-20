# MCMod Editor Gecko Scroll Fix (MC百科编辑器 Gecko 防跳顶补丁)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![UserScript](https://img.shields.io/badge/UserScript-Violentmonkey%20%7C%20Tampermonkey-green.svg)](#安装方式)

专为 **Firefox / Zen Browser / Floorp** 等 Gecko 内核浏览器打造的轻量级用户脚本。

尝试修复在 **[MC百科 (MCMod.cn)](https://www.mcmod.cn/)** 编辑长篇模组资料时，插入超链接或修改图片信息后编辑框跳回第1行的问题。

代码为Vibe Coding生成，可能存在问题。模型：Gemini 3.8 Flash。

---

## 原理

MCMod.cn 采用经典的百度富文本编辑器（UEditor 1.4.x），其核心编辑区是一个独立的 `<iframe>`（`ueditor_0`）。

1. 当用户点击“插入链接/图片”时，弹窗（`link.html`）处于顶层并获得焦点，内层编辑框处于失焦状态；
2. 弹窗关闭并交还光标时，UEditor 的历史特判代码中存在 `if (browser.gecko) { me.body.focus(); }`；
3. Gecko 严格恪守 W3C 规范，对整个文档的根节点执行全局 `focus()` 时，若无特定参数会强制将视口对齐至起点 `(0, 0)`；
4. 随后 UEditor 在未正确捕获失焦光标坐标的情况下，计算出偏移量为 0，向内层 iframe 发出了 `scrollTo(0, 0)` 指令。

**本补丁的作用机制**：

* 挂载 UEditor 的实例生命周期，捕获内层 `ueditor_0` 的真实滚动距离；
* 在内层 `body.focus()` 注入现代 Gecko 支持的 `{ preventScroll: true }` 静默聚焦属性；
* 拦截非用户触发的恶意 `scrollTo(0, 0)` 指令；
* 在命令执行与弹窗关闭的关键时刻，施加无感的多级位置复位锁。

---

## 安装方式

### 前置要求
浏览器需安装任意一款用户脚本管理器扩展：
* **[Violentmonkey (暴力猴)](https://violentmonkey.github.io/)** *(推荐)*
* **[Tampermonkey (篡改猴)](https://www.tampermonkey.net/)**
* **[ScriptCat (脚本猫)](https://scriptcat.org/)**

### 一键安装
点击下方链接，脚本管理器将自动弹出安装界面，点击“确认安装”即可：

👉 **[安装脚本 (GitHub Raw)](https://raw.githubusercontent.com/BlueMap1e/mcmod-editor-gecko-fix/main/mcmod-editor-gecko-fix.user.js)**

*(若访问 GitHub 较慢，也可复制仓库中的 `mcmod-editor-gecko-fix.user.js` 代码，在脚本管理器中“新建脚本”并粘贴保存)*
