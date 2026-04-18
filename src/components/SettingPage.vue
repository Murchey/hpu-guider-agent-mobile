<template>
  <div class="setting-page">
    <el-card class="settings-card shadow-sm">
      <template #header>
        <div class="card-header">
          <el-icon><Setting /></el-icon>
          <span>API 核心配置</span>
        </div>
      </template>
      <div class="tips">
        <div class="api-item">
          <span class="label">服务商 (Provider)</span>
          <span class="value">{{ MANUAL_API_SETTINGS.provider }}</span>
        </div>
        <div class="api-item">
          <span class="label">机器人 ID (Bot ID)</span>
          <span class="value">{{ MANUAL_API_SETTINGS.botId }}</span>
        </div>
        <div class="api-item">
          <span class="label">接口地址 (Base URL)</span>
          <span class="value">{{ MANUAL_API_SETTINGS.baseURL }}</span>
        </div>
        <div class="api-item save-action">
          <el-button type="primary" class="save-btn" @click="applyCozeSettings">
            应用 Coze 核心配置
          </el-button>
        </div>
      </div>
    </el-card>

    <div class="action-buttons">
      <el-button 
        type="primary" 
        plain 
        class="switch-btn"
        @click="showCustomSettings = !showCustomSettings"
      >
        <el-icon><Refresh /></el-icon>
        {{ showCustomSettings ? '显示 Coze 核心配置' : '显示自定义 API 配置' }}
      </el-button>
    </div>

    <el-card v-if="showCustomSettings" class="settings-card shadow-sm custom-api-card">
      <template #header>
        <div class="card-header">
          <el-icon><Edit /></el-icon>
          <span>自定义 API 配置</span>
        </div>
      </template>
      <div class="tips">
        <div class="api-item">
          <span class="label">服务商 (Provider)</span>
          <el-input v-model="CUSTOM_API_SETTINGS.provider" placeholder="例如: openai, custom" />
        </div>
        <div class="api-item">
          <span class="label">接口地址 (Base URL)</span>
          <el-input v-model="CUSTOM_API_SETTINGS.baseURL" placeholder="接口根地址" />
        </div>
        <div class="api-item">
          <span class="label">模型 (Model)</span>
          <el-input v-model="CUSTOM_API_SETTINGS.model" placeholder="例如: gpt-3.5-turbo" />
        </div>
        <div class="api-item">
          <span class="label">API Key</span>
          <el-input v-model="CUSTOM_API_SETTINGS.apiKey" type="password" show-password placeholder="输入您的 API Key" />
        </div>
        <div class="api-item save-action">
          <el-button type="success" class="save-btn" @click="saveCustomSettings">
            保存并应用自定义配置
          </el-button>
        </div>
      </div>
    </el-card>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { Setting, Refresh, Link, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const showCustomSettings = ref(false)

const MANUAL_API_SETTINGS = {
  // provider 可选：openai / siliconflow / zhipu / qwen / coze / custom
  provider: 'coze',
  baseURL: 'https://api.coze.cn',
  apiKey: 'pat_dwOqipNExoqRFtk4RkKhyj3IkxvaMPU2ozUrle8yvhleoJe6OCIEXWVvfbCH4GlA',
  botId: '7622230218706731042',
  model: ''
}

const CUSTOM_API_SETTINGS = reactive({
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  botId: ''
})

const saveCustomSettings = () => {
  if (!CUSTOM_API_SETTINGS.apiKey) {
    ElMessage.warning('请输入 API Key')
    return
  }
  localStorage.setItem('ai-chat-settings', JSON.stringify(CUSTOM_API_SETTINGS))
  ElMessage.success('自定义配置已保存并应用')
}

const applyCozeSettings = () => {
  localStorage.setItem('ai-chat-settings', JSON.stringify(MANUAL_API_SETTINGS))
  showCustomSettings.value = false
  ElMessage.success('已应用 Coze 核心配置')
}

const applyManualApiSettings = () => {
  // 只有当本地没有配置时，才初始化默认的 Coze 配置
  if (!localStorage.getItem('ai-chat-settings')) {
    localStorage.setItem('ai-chat-settings', JSON.stringify(MANUAL_API_SETTINGS))
  } else {
    // 如果本地已有配置，尝试回填到自定义表单中
    try {
      const saved = JSON.parse(localStorage.getItem('ai-chat-settings') || '{}')
      if (saved.provider !== 'coze') {
        Object.assign(CUSTOM_API_SETTINGS, saved)
        showCustomSettings.value = true
      }
    } catch (e) {
      console.error('Failed to parse settings', e)
    }
  }
}

// 确保 HMR 时也能同步最新的配置
onMounted(() => {
  applyManualApiSettings()
})
</script>

<style scoped>
.setting-page {
  width: 100%;
  min-height: 100%;
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  box-sizing: border-box;
}

.settings-card {
  width: 92%; /* 针对 375 宽度优化，留出两侧间隙 */
  max-width: 600px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

.custom-api-card {
  border-left: 4px solid var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.save-action {
  margin-top: 20px;
}

.save-btn {
  width: 100%;
  height: 40px;
  border-radius: 8px;
}

.action-buttons {
  margin-bottom: 20px;
  width: 92%;
  max-width: 600px;
}

.switch-btn {
  width: 100%;
  height: 45px;
  border-radius: 10px;
  font-weight: 600;
}

@media (min-width: 769px) {
  .settings-card {
    width: 70%;
  }
}

.card-header {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.tips {
  margin: 0;
  line-height: 1.6;
  font-size: 14px;
  color: var(--el-text-color-regular);
  word-break: break-all; /* 关键：防止长 URL 在 375 宽度下溢出 */
}

.api-item {
  margin-bottom: 12px;
}

.api-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 600;
  color: var(--el-text-color-secondary);
  display: block;
  margin-bottom: 2px;
  font-size: 12px;
}

.value {
  display: block;
  padding: 8px 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  font-family: monospace;
}

html.dark .settings-card {
  background: #1d1e1f;
  border-color: #333;
}

html.dark .custom-api-card {
  background: #1a2c20;
  border-left-color: var(--el-color-success);
}

html.dark .value {
  background: #2a2b2d;
}
</style>
