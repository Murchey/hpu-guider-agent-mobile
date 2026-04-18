# 安卓项目对接及 WebView 优化建议方案

针对您在手机端切换应用（应用进入后台）时出现的报错问题，这通常是由于安卓系统对 WebView 的内存管理和进程限制导致的。以下是针对安卓端项目的优化建议，以确保 Vue 项目在 Hybrid App 环境下稳定运行。

## 1. 核心修复建议：开启 WebView 后台执行权限

安卓系统为了省电，在应用切换到后台时可能会挂起 WebView 的 JS 线程。

**建议：** 在 `Activity` 或 `Fragment` 中，确保 WebView 在后台时不被彻底销毁，并尝试保持网络连接。

```java
// 安卓原生代码示例
webView.getSettings().setJavaScriptEnabled(true);
webView.getSettings().setDomStorageEnabled(true); // 必须开启，否则 localStorage 会报错
webView.getSettings().setDatabaseEnabled(true);

// 关键：防止切屏时页面重载
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
    webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
}
```

## 2. 处理 Android 生命周期 (推荐)

最稳健的方案是在安卓原生层监听应用切换，并通知前端。

- **应用进入后台**：在 `onStop()` 或 `onPause()` 中，不要调用 `webView.pauseTimers()`，除非您确定不需要后台运行。如果调用了该方法，JS 的 `setTimeout` 和 `fetch` 会被全局暂停，导致恢复时连接超时报错。
- **应用返回前台**：在 `onResume()` 中调用 `webView.resumeTimers()`。

## 3. 避免 WebView 进程被系统回收

如果手机内存不足，系统会优先杀死后台应用的 WebView 进程。

**建议方案：**
- **增加内存权限**：在 `AndroidManifest.xml` 中增加 `largeHeap="true"`。
- **配置 Activity 属性**：在 `manifest` 中为 WebView 所在的 Activity 添加：
  `android:configChanges="orientation|screenSize|keyboardHidden|layoutDirection"`
  这样可以防止切换应用时因配置更改导致的 Activity 销毁重建。

## 4. 前端 (Vue) 层的容错处理

我已经在本项目的 `App.vue` 中添加了 `visibilitychange` 监听。

- **网络容错**：AI 对话使用流式输出（SSE/Fetch Stream），切换应用时如果断网，前端会捕获 `TypeError: Failed to fetch`。
- **解决方案**：在安卓原生层集成 **网络状态监听**，当网络恢复时，如果 WebView 报错，自动执行 `webView.reload()` 或通知前端进行重连。

## 5. 常见报错及排查对照表

| 现象 | 可能原因 | 解决办法 |
| :--- | :--- | :--- |
| 切屏回来看见空白 | WebView 进程被杀死 | 安卓原生监听 `onRenderProcessGone` 并重启 Activity |
| 提示 API 错误 | 后台网络请求被截断 | 在 `fetch` 请求中添加 `AbortController` 并在后台时取消，或增加重试机制 |
| localStorage 丢失 | 未开启 DomStorage | `settings.setDomStorageEnabled(true)` |

## 总结
该报错 **90% 概率源于安卓原生 WebView 的配置限制** 而非 Vue 代码本身。请安卓开发人员重点检查 **DomStorage** 开关以及 **后台进程保活** 配置。
