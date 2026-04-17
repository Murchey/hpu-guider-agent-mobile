<template>
  <div class="app-container">
    <div class="header-controls">
      <el-switch
        v-model="isDarkMode"
        active-text="暗色"
        inactive-text="浅色"
        @change="handleThemeChange"
      />
    </div>
    <el-tabs
      v-model="activeName"
      class="index-tabs"
      tab-position="bottom"
      @tab-click="handleClick">
      
      <el-tab-pane name="indexPage">
        <template #label>
          <div class="nav-item">
            <el-icon><HomeFilled /></el-icon>
            <span class="nav-label">首页</span>
          </div>
        </template>
        <IndexPage @navigate="handleNavigate" />
      </el-tab-pane>
      
      <el-tab-pane name="aiDialogue">
        <template #label>
          <div class="nav-item">
            <el-icon><ChatLineRound /></el-icon>
            <span class="nav-label">AI对话</span>
          </div>
        </template>
        <AiDialoguePage :active-tab="activeName" />
      </el-tab-pane>
      
      <el-tab-pane name="settingPage">
        <template #label>
          <div class="nav-item">
            <el-icon><Setting /></el-icon>
            <span class="nav-label">设置</span>
          </div>
        </template>
        <SettingPage />
      </el-tab-pane>
      
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { HomeFilled, ChatLineRound, Setting } from '@element-plus/icons-vue'
import type { TabsPaneContext } from 'element-plus'
import IndexPage from './components/IndexPage.vue'
import AiDialoguePage from './components/AiDialoguePage.vue'
import SettingPage from './components/SettingPage.vue'

const activeName = ref('indexPage')
const isDarkMode = ref(false)

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event)
}

const handleNavigate = (tabName: string) => {
  activeName.value = tabName
}

const applyTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle('dark', isDark)
  document.body.classList.toggle('dark', isDark)
}

const loadTheme = () => {
  const saved = localStorage.getItem('theme-mode')
  isDarkMode.value = saved === 'dark'
  applyTheme(isDarkMode.value)
}

const handleThemeChange = (val: string | number | boolean) => {
  const nextIsDark = Boolean(val)
  isDarkMode.value = nextIsDark
  localStorage.setItem('theme-mode', nextIsDark ? 'dark' : 'light')
  applyTheme(nextIsDark)
}

onMounted(() => {
  loadTheme()
})
</script>

<style>
@font-face {
  font-family: 'HanYiQiHei';
  src: url('./assets/HanYiQiHei-65Jian-Regular-2.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  font-family: var(--app-font-family);
}

html {
  /* ========= 可自定义：全局字体（含 Element Plus） ========= */
  --app-font-family: 'HanYiQiHei', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --el-font-family: var(--app-font-family);

  /* ========= 可自定义：浅色模式（全局背景/导航栏） ========= */
  --app-page-bg: #ffffff;
  --app-tabs-header-bg: rgba(255, 255, 255, 0.55);
  --app-tabs-header-border-color: rgba(0, 0, 0, 0.08);
  --app-tabs-header-blur: 20px;

  --el-bg-color-page: var(--app-page-bg);
}

html.dark {
  /* ========= 可自定义：深色模式（全局背景/导航栏） ========= */
  --app-page-bg: #1d1e1fec;
  --app-tabs-header-bg: rgba(29, 30, 31, 0.55);
  --app-tabs-header-border-color: rgba(255, 255, 255, 0.10);
  --app-tabs-header-blur: 20px;

  --el-bg-color-page: var(--app-page-bg);
}

html, body {
  background: var(--app-page-bg);
}

#app {
  height: 100vh;
  width: 100vw;
}

.app-container {
  height: 100vh;
  width: 100vw;
  padding: 0px;
  box-sizing: border-box;
  background: var(--el-bg-color-page);
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.header-controls {
  position: absolute;
  top: 15px;
  right: 20px;
  z-index: 200;
  display: flex;
  align-items: center;
  background: var(--app-tabs-header-bg);
  padding: 4px 8px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid var(--app-tabs-header-border-color);
}

/* 响应式适配：移动端 (屏幕宽度 <= 768px) */
@media (max-width: 768px) {
  .header-controls {
    top: 10px;
    right: 15px;
    padding: 2px 6px;
  }
  
  .header-controls :deep(.el-switch__label) {
    display: none;
  }
  
  .header-controls :deep(.el-switch) {
    height: 20px;
  }

  .index-tabs :deep(.el-tabs__item) {
    font-size: 14px;
    height: 60px;
  }
  
  .index-tabs .el-tabs__content {
    padding: 0;
    padding-bottom: 60px;
  }
}

.index-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.index-tabs :deep(.el-tabs__header) {
  margin: 0px !important;
  padding: 5px 0 !important;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--app-tabs-header-bg);
  border-top: 1px solid var(--app-tabs-header-border-color);
  backdrop-filter: blur(var(--app-tabs-header-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--app-tabs-header-blur)) saturate(180%);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  display: flex !important;
  justify-content: center !important;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
}

.nav-item .el-icon {
  font-size: 22px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
}

.index-tabs :deep(.el-tabs__nav-wrap) {
  width: 100% !important;
  max-width: 500px !important;
  display: flex !important;
  justify-content: center !important;
}

.index-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none !important;
}

.index-tabs :deep(.el-tabs__nav-scroll) {
  width: 100% !important;
  display: flex !important;
  justify-content: center !important;
}

.index-tabs :deep(.el-tabs__nav) {
  display: flex !important;
  width: 100% !important;
  justify-content: space-around !important;
  float: none !important;
}

.index-tabs :deep(.el-tabs__item) {
  flex: 1 !important;
  height: 55px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: #909399;
}

.index-tabs :deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
}

.index-tabs :deep(.el-tabs__active-bar) {
  display: none; /* 底部导航通常不需要下划线 */
}

.index-tabs .el-tabs__nav-wrap::after {
  display: none;
}

.index-tabs .el-tabs__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 60px; /* 为底部导航预留空间 */
  box-sizing: border-box;
  background: transparent;
  
  /* 隐藏滚动条但保留滚动功能 (Firefox / IE) */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 隐藏滚动条 (Chrome / Safari / Edge) */
.index-tabs .el-tabs__content::-webkit-scrollbar {
  display: none;
}

.index-tabs .el-tab-pane {
  height: 100%;
}

.info-dialog .el-dialog__header {
  text-align: center;
}

.info-dialog .el-dialog__title {
  font-size: 18px;
  font-weight: bold;
}

html.dark .info-dialog .el-dialog__header {
  /* 问卷抬头下方分割线颜色，默认与背景一致 */
  border-bottom: 1px solid #141414;
}

html.dark .info-dialog .el-dialog__title {
  /* 问卷标题字体颜色 */
  color: e4e7ed;
}

/* html.dark .info-dialog .el-dialog__body {
  background: #141414;
} */

html.dark .info-dialog .el-dialog__footer {
  /* 问卷按钮所在页脚颜色 */
  background: #141414;
  /* 问卷按钮页脚分割线 */
  border-top: 1px solid #141414;
}

html.dark .info-dialog .el-form {
  /* 问卷表单之间gap背景颜色 */
  background: #141414;
}

html.dark .info-dialog .el-form-item {
  /* 问卷选选项栏目边角颜色，默认与背景一致 */
  background: #141414;
}

html.dark .info-dialog .el-form-item__label {
  /* 问卷左侧问题背景颜色 */
  background: #141414;
  /* 问卷左侧问题字体颜色 */
  color: #e4e7ed;
}

/* 设置 tooltip 淡入淡出时长为 0 */
.el-popper {
  transition: none !important;
  animation: none !important;
}
</style>
