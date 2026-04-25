<template>
  <div class="app-container">
    <div class="index-tabs">
      
      <div v-show="activeName === 'indexPage'" class="tab-pane">
        <IndexPage @navigate="handleNavigate" />
      </div>
      
      <div v-show="activeName === 'aiDialogue'" class="tab-pane">
        <AiDialoguePage 
          :active-tab="activeName" 
          @navigate="handleNavigate" 
          @input-focus="handleInputFocus"
        />
      </div>
      
      <div v-show="activeName === 'mapPlanning'" class="tab-pane">
        <MapPlanningPage :active-tab="activeName" @navigate="handleNavigate" />
      </div>
      
      <div v-show="activeName === 'settingPage'" class="tab-pane">
        <SettingPage @navigate="handleNavigate" />
      </div>
      
    </div>

    <!-- 自定义底部导航栏 -->
    <div v-show="!(isInputFocused && isMobile)" class="custom-bottom-nav">
      <div 
        class="nav-item" 
        :class="{ active: activeName === 'indexPage' }"
        @click="activeName = 'indexPage'"
      >
        <var-icon name="home" />
        <span class="nav-label">首页</span>
      </div>
      <div 
        class="nav-item" 
        :class="{ active: activeName === 'aiDialogue' }"
        @click="activeName = 'aiDialogue'"
      >
        <var-icon name="message-text-outline" />
        <span class="nav-label">AI对话</span>
      </div>
      <div 
        class="nav-item" 
        :class="{ active: activeName === 'mapPlanning' }"
        @click="activeName = 'mapPlanning'"
      >
        <var-icon name="map-marker" />
        <span class="nav-label">路线</span>
      </div>
      <div 
        class="nav-item" 
        :class="{ active: activeName === 'settingPage' }"
        @click="activeName = 'settingPage'"
      >
        <var-icon name="cog" />
        <span class="nav-label">设置</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import IndexPage from './components/IndexPage.vue'
import AiDialoguePage from './components/AiDialoguePage.vue'
import MapPlanningPage from './components/MapPlanningPage.vue'
import SettingPage from './components/SettingPage.vue'
import { useThemeStore } from './stores/themeStore'

const themeStore = useThemeStore()
const activeName = ref('indexPage')
const isInputFocused = ref(false)
const isMobile = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const handleNavigate = (tabName: string) => {
  activeName.value = tabName
}

const handleInputFocus = (focused: boolean) => {
  isInputFocused.value = focused
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  themeStore.loadTheme()

  // 处理手机切屏/后台挂起逻辑
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log('App 进入后台，保存关键状态...')
      // 可以在此处停止耗时的动画或轮询
    } else {
      console.log('App 返回前台，恢复状态...')
      // 可以在此处检查配置是否需要重载
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
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
  --app-text-primary: #303133;

  --el-bg-color-page: var(--app-page-bg);
  --color-text: var(--app-text-primary);
  --color-primary: #3a7afe;
}

html.dark {
  /* ========= 可自定义：深色模式（全局背景/导航栏） ========= */
  --app-page-bg: #141414;
  --app-tabs-header-bg: rgba(20, 20, 20, 0.75);
  --app-tabs-header-border-color: rgba(255, 255, 255, 0.10);
  --app-tabs-header-blur: 20px;
  --app-text-primary: #e5eaf3;

  --el-bg-color-page: var(--app-page-bg);
  --color-text: var(--app-text-primary);
  --color-primary: #3a7afe;
}

html, body {
  background: var(--app-page-bg);
  color: var(--app-text-primary);
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

/* 响应式适配：移动端 (屏幕宽度 <= 768px) */
@media (max-width: 768px) {
  .header-controls {
    top: 10px;
    right: 15px;
    padding: 4px 8px;
  }
  
  .theme-text {
    display: none;
  }

  .index-tabs {
    padding-bottom: 0;
  }
}

.index-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.custom-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 65px; /* 从 70px 略微下调，更适合 812px 高度 */
  background: var(--app-tabs-header-bg);
  backdrop-filter: blur(var(--app-tabs-header-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--app-tabs-header-blur)) saturate(180%);
  border-top: 1px solid var(--app-tabs-header-border-color);
  box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  flex: 1;
  max-width: 120px; /* 回归紧凑宽度 */
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-item.active {
  color: var(--color-primary);
}

.nav-item .var-icon {
  font-size: 24px; /* 稍微缩小图标 */
  margin-bottom: 3px;
}

.nav-label {
  font-size: 11px; /* 字体微调，更符合 375 宽度 */
  font-weight: 600;
  line-height: 1;
}

.tab-pane {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 0;
  box-sizing: border-box;
  background: transparent;
  
  /* 隐藏滚动条但保留滚动功能 (Firefox / IE) */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 隐藏滚动条 (Chrome / Safari / Edge) */
.tab-pane::-webkit-scrollbar {
  display: none;
}

/* 设置 tooltip 淡入淡出时长为 0 */
.el-popper {
  transition: none !important;
  animation: none !important;
}
</style>
