<template>
  <div class="ai-dialogue-page">
    <div class="chat-container">
      <div class="chat-header">
        <var-button
          text
          round
          class="history-btn"
          @click="drawer = true"
        >
          <var-icon name="menu" :size="24" />
        </var-button>
        <span class="header-title">文途智行</span>
        <div class="header-spacer"></div>
      </div>
      <div class="chat-messages" ref="messagesRef">
        <div v-if="messages.length === 0 && !isSettingsLoaded" class="empty-tip">
          <var-result class="result-empty" :image="agentIcon" :img-size="emptyImageSize" title="加载设置中..." />
        </div>
        <div v-else-if="messages.length === 0" class="empty-tip">
          <var-result class="result-empty" :image="agentIcon" :img-size="emptyImageSize" :title="welcomeMessage" />
        </div>
        
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-avatar">
            <var-avatar :size="40" :src="msg.role === 'assistant' ? agentIcon : undefined">
              <var-icon v-if="msg.role === 'user'" name="account-circle" />
            </var-avatar>
          </div>
          <div class="message-content">
            <div class="message-role">
              {{ msg.role === 'user' ? '你' : '文途智行' }}
            </div>
            <div v-if="msg.imageUrl" class="message-image-wrapper">
              <var-image 
                :src="msg.imageUrl" 
                class="message-image" 
                fit="cover" 
                ripple
                @click="previewImage(msg.imageUrl)"
              />
            </div>
            <div class="message-card" :class="msg.role">
              <div v-if="editingIndex === index" class="message-edit-area">
                <var-input
                  v-model="editingText"
                  textarea
                  :rows="1"
                  class="edit-input"
                />
                <div class="edit-actions">
                  <var-button size="small" @click="cancelEdit">取消</var-button>
                  <var-button size="small" type="primary" @click="submitEdit(index)">提交并重发</var-button>
                </div>
              </div>
              <div v-else class="message-text markdown-body" v-html="msg.role === 'assistant' ? formatAssistantMessage(msg.content) : formatMessage(msg.content)"></div>
              <div v-if="msg.role === 'assistant' && hasMapData(msg.content)" class="map-action-wrapper">
                <var-button 
                  type="success" 
                  size="small" 
                  @click="goToMap(msg.content)"
                >
                  <var-icon name="map-marker" />
                  转到地图
                </var-button>
              </div>
            </div>
            <div v-if="editingIndex !== index" class="message-tools">
              <var-button text round @click.stop="handleCopy(msg.content)">
                <var-icon name="content-copy" size="18"/>
              </var-button>
              <var-button v-if="msg.role === 'user'" text round @click.stop="startEdit(index, msg.content)">
                <var-icon name="pencil" size="18"/>
              </var-button>
              <var-button text round @click.stop="handleDeleteMessage(index)">
                <var-icon name="delete" size="18"/>
              </var-button>
            </div>
          </div>
        </div>
        
        <div v-if="isLoading" class="message-item assistant">
          <div class="message-avatar">
            <var-avatar :size="40" :src="agentIcon" />
          </div>
          <div class="message-content">
            <div class="message-card loading-card">
              <var-loading type="circle" size="normal" color="var(--color-primary)" />
              <span style="margin-left: 8px;">文途智行正在思考中...</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="chat-input-container" :class="{ 'input-focused': isInputFocused && isMobile }">
        <!-- 图片预览区域 -->
        <div v-if="uploadedImages.length > 0" class="image-preview-floating">
          <div v-for="(img, index) in uploadedImages" :key="index" class="image-preview-wrapper">
            <var-image 
              :src="img.url" 
              class="image-preview" 
              fit="cover"
              ripple
            />
            <var-icon class="remove-image-btn" name="close-circle" @click="removeUploadedImage(index)" />
          </div>
          <div v-if="isUploadingImage" class="upload-loading-overlay">
            <var-loading type="circle" size="small" />
          </div>
        </div>

        <div class="gemini-input-pill">
          <!-- 左侧：功能组合区（模式切换 + 上传） -->
          <div class="left-action-group">
            <!-- 模式切换 -->
            <var-menu placement="top-start" :offset-y="12">
              <var-button text round class="secondary-icon-btn mode-btn">
                <var-icon name="wrench" :size="24" class="mode-icon" />
              </var-button>
              
              <template #menu>
                <div class="mode-popover">
                  <div 
                    v-for="opt in modeOptions" 
                    :key="opt"
                    class="mode-popover-item"
                    :class="{ active: modeValue === opt }"
                    @click="modeValue = opt"
                  >
                    {{ opt }}
                  </div>
                </div>
              </template>
            </var-menu>

            <!-- 上传图片（作为前缀图标） -->
            <var-uploader
              v-model="fileList"
              class="pill-uploader var-uploader--outline-none"
              accept="image/*"
              :disabled="isLoading"
              @after-read="handleFileChange"
              @remove="removeUploadedImage"
              hide-list
              multiple
            >
              <var-button text round class="secondary-icon-btn upload-btn">
                <var-icon name="image-outline" :size="22" />
              </var-button>
            </var-uploader>
            
            <!-- 细分割线 -->
            <div class="vertical-divider"></div>
          </div>

          <!-- 中间：输入区域 -->
          <div class="input-area">
            <var-input
              v-model="inputText"
              textarea
              placeholder="输入文字、说话或分享照片..."
              :disabled="isLoading"
              :rows="1"
              variant="standard"
              class="pill-textarea"
              :hint="false"
              :line="false"
              @keydown.enter.exact.prevent="handleSend"
              @keydown.shift.enter.prevent="handleNewLine"
              @focus="() => { isInputFocused = true; emit('input-focus', true); }"
              @blur="() => { isInputFocused = false; emit('input-focus', false); }"
            />
          </div>

          <!-- 右侧：核心动作区（动态发送/语音） -->
          <div class="right-action-area">
            <transition name="fade-scale" mode="out-in">
              <var-button
                v-if="!inputText.trim()"
                key="mic"
                text
                round
                class="secondary-icon-btn main-action"
                @click="Snackbar.info('请先输入内容或上传图片')"
              >
                <var-icon name="send-outline" :size="24" class="send-idle-icon" />
              </var-button>
              <var-button
                v-else
                key="send"
                round
                class="send-pill-btn"
                :loading="isLoading"
                @click="handleSend"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="send-svg-icon">
                  <path 
                    d="M21 3L3 11.5L8.5 12.5L9.5 18L21 3Z" 
                    stroke="white" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                  />
                </svg>
              </var-button>
            </transition>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 单选卡 -->
    <var-popup
      v-model:show="sceneDialogVisible"
      position="center"
      class="scene-dialog"
      :style="{ width: dialogWidth, padding: '20px', borderRadius: '12px' }"
    >
      <div class="dialog-title" style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 15px; color: var(--color-primary)">请选择下列选项</div>
      <div v-if="sceneButtons.description" class="dialog-desc-card">
        <div class="dialog-desc-text">{{ sceneButtons.description }}</div>
      </div>
      <div class="scene-buttons-container">
        <var-button 
          v-if="sceneButtons.btn1" 
          type="primary" 
          outline 
          class="scene-btn" 
          @click="handleSceneButtonClick(1, sceneButtons.btn1)"
        >
          {{ sceneButtons.btn1 }}
        </var-button>
        <var-button 
          v-if="sceneButtons.btn2" 
          type="primary" 
          outline 
          class="scene-btn" 
          @click="handleSceneButtonClick(2, sceneButtons.btn2)"
        >
          {{ sceneButtons.btn2 }}
        </var-button>
        <var-button 
          v-if="sceneButtons.btn3" 
          type="primary" 
          outline 
          class="scene-btn" 
          @click="handleSceneButtonClick(3, sceneButtons.btn3)"
        >
          {{ sceneButtons.btn3 }}
        </var-button>
      </div>
    </var-popup>

    <!-- 多选推荐对话框 -->
    <var-popup
      v-model:show="selectDialogVisible"
      position="center"
      class="select-dialog"
      :style="{ width: dialogWidth, padding: '20px', borderRadius: '12px' }"
    >
      <div class="dialog-title" style="text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 15px; color: var(--color-primary)">请从以下选项中选择</div>
      <div v-if="selectDescription" class="dialog-desc-card">
        <div class="dialog-desc-text">{{ selectDescription }}</div>
      </div>
      <div class="select-options-container">
        <var-checkbox-group v-model="selectedValues" direction="vertical">
          <var-checkbox 
            v-for="option in selectOptions" 
            :key="option" 
            :checked-value="option"
            class="select-checkbox-item"
          >
            {{ option }}
          </var-checkbox>
        </var-checkbox-group>
        <div class="select-dialog-footer">
          <var-button @click="selectDialogVisible = false">取消</var-button>
          <var-button type="primary" @click="handleSelectConfirm" :disabled="selectedValues.length === 0">确认选择</var-button>
        </div>
      </div>
    </var-popup>

    <!-- 对话历史抽屉 -->
    <var-popup
      v-model:show="drawer"
      position="left"
      :style="{ width: '300px', height: '100%' }"
    >
      <div class="drawer-content">
        <div class="drawer-header" style="padding: 16px; font-size: 18px; font-weight: bold; border-bottom: 1px solid var(--color-outline)">
          对话历史
        </div>
        <div class="new-chat-container" style="padding-top: 16px;">
          <var-button type="primary" outline class="new-chat-btn" @click="handleNewChat">
            <var-icon name="plus" />
            新建文途智行对话
          </var-button>
        </div>
        <var-divider description="历史记录" />
        <div class="history-list">
          <div 
            v-for="session in chatStore.sessions" 
            :key="session.id"
            class="history-item"
            :class="{ active: chatStore.currentSessionId === session.id }"
            @click="handleSelectSession(session.id)"
          >
            <div class="history-item-content">
              <var-icon name="message-processing" />
              <span class="history-item-title">{{ session.title }}</span>
            </div>
            <div class="history-item-actions">
              <var-button 
                type="primary" 
                text 
                round
                class="history-action-btn rename-btn"
                @click.stop="handleRenameSession(session.id, session.title)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17 3L21 7L8 20H4V16L17 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </var-button>
              <var-button 
                type="danger" 
                text 
                round
                class="history-action-btn"
                @click.stop="handleDeleteSession(session.id)"
              >
                <var-icon name="delete" size="16" />
              </var-button>
            </div>
          </div>
          <div v-if="chatStore.sessions.length === 0" class="empty-tip" style="padding-top: 40px;">
            <var-result class="result-empty" title="暂无对话历史" />
          </div>
        </div>
      </div>
    </var-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, computed, watch } from 'vue'
import { Snackbar, Dialog, ImagePreview } from '@varlet/ui'
import axios from 'axios'
import MarkdownIt from 'markdown-it'
import agentIcon from '../assets/agent_icon.jpg'
import { useChatStore } from '../stores/chatStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
  imageUrl?: string
}

const props = defineProps<{
  activeTab?: string
}>()

const emit = defineEmits<{
  (e: 'navigate', tabName: string): void
  (e: 'input-focus', focused: boolean): void
}>()

const chatStore = useChatStore()
const messages = computed(() => chatStore.currentSession?.messages || [])

// 监听消息变化，自动滚动到底部
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

const inputText = ref('')
const isLoading = ref(false)
const isInputFocused = ref(false)
const messagesRef = ref<HTMLElement | null>(null)

// 消息编辑相关
const editingIndex = ref<number | null>(null)
const editingText = ref('')

const previewImage = (url: string) => {
  ImagePreview(url)
}

const startEdit = (index: number, content: string) => {
  editingIndex.value = index
  editingText.value = content
}

const cancelEdit = () => {
  editingIndex.value = null
  editingText.value = ''
}

const submitEdit = async (index: number) => {
  const text = editingText.value.trim()
  if (!text || isLoading.value) return
  
  // 修改并截断对话
  chatStore.editMessageAndTruncate(index, text)
  editingIndex.value = null
  editingText.value = ''
  
  // 重新发送
  await sendMessage(text, true)
}

const handleCopy = (content: string) => {
  navigator.clipboard.writeText(content).then(() => {
    Snackbar.success('已复制到剪贴板')
  }).catch(() => {
    Snackbar.error('复制失败')
  })
}

const handleDeleteMessage = (index: number) => {
  Dialog({
    title: '提示',
    message: '确定要删除这条消息吗？',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then((action) => {
    if (action === 'confirm') {
      chatStore.deleteMessage(index)
      Snackbar.success('消息已删除')
    }
  })
}

// 图片上传相关
const uploadedImages = ref<{ url: string; id: string }[]>([])
const isUploadingImage = ref(false)
const fileList = ref<any[]>([])

const handleFileChange = async (file: any) => {
  const rawFile = file.file
  if (!rawFile) return

  // 根据模式处理图片
  const { imageMode } = apiSettings.value
  
  if (imageMode === 'coze') {
    // 生成预览
    const url = URL.createObjectURL(rawFile)
    // 自动上传到 Coze
    isUploadingImage.value = true
    try {
      const fileId = await uploadImageToCoze(rawFile)
      if (fileId) {
        uploadedImages.value.push({ url, id: fileId })
        Snackbar.success('图片上传成功')
      }
    } catch (error: any) {
      Snackbar.error('上传失败: ' + error.message)
    } finally {
      isUploadingImage.value = false
    }
  } else {
    // Base64 模式 (适配硅基流动等)
    isUploadingImage.value = true
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        uploadedImages.value.push({ url: base64, id: base64 })
        Snackbar.success('图片已就绪')
        isUploadingImage.value = false
      }
      reader.onerror = () => {
        throw new Error('图片读取失败')
      }
      reader.readAsDataURL(rawFile)
    } catch (error: any) {
      Snackbar.error(error.message)
      isUploadingImage.value = false
    }
  }
}

const removeUploadedImage = (index?: any) => {
  if (typeof index === 'number') {
    uploadedImages.value.splice(index, 1)
    fileList.value.splice(index, 1)
  } else {
    uploadedImages.value = []
    fileList.value = []
  }
}

const uploadImageToCoze = async (file: File) => {
  if (!apiSettings.value.apiKey) {
    Snackbar.warning('上传图片需要先配置 API Key')
    return null
  }

  const { baseURL, apiKey } = apiSettings.value
  // Coze 文件上传地址固定为 /v1/files/upload
  const uploadURL = baseURL.replace(/\/v3\/chat$/, '').replace(/\/+$/, '') + '/v1/files/upload'
  
  const formData = new FormData()
  formData.append('file', file)

  const response = await axios.post(uploadURL, formData, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'multipart/form-data'
    }
  })

  if (response.data && response.data.data && response.data.data.id) {
    return response.data.data.id
  } else {
    throw new Error(response.data.msg || '上传失败')
  }
}

// 响应式判断
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

const dialogWidth = computed(() => isMobile.value ? '95%' : '900px')
const emptyImageSize = computed(() => isMobile.value ? 140 : 250) // 针对 375x812 屏幕下调尺寸，避免遮挡输入框

// 场景推荐对话框状态
const sceneDialogVisible = ref(false)
const sceneButtons = ref({
  description: '',
  btn1: '',
  btn2: '',
  btn3: ''
})

// 侧边栏抽屉状态
const drawer = ref(false)
const direction = ref('ltr')

// 多选弹窗状态
const selectDialogVisible = ref(false)
const selectOptions = ref<string[]>([])
const selectDescription = ref('')
const selectedValues = ref<string[]>([])

const modeValue = ref('互动问答')

const modeOptions = ['互动问答', '景点介绍']

const modeOptionsBtnGroup = computed(() => {
  if (modeValue.value === '互动问答') return 'model：智能导游\n工作模式（task_type）：互动问答\n'
  if (modeValue.value === '景点介绍') return 'model：智能导游\n工作模式（task_type）：景点介绍\n'
  return ''
})

const apiSettings = ref({
  provider: 'openai',
  baseURL: '',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  botId: '',
  imageMode: 'base64'
})

const isSettingsLoaded = ref(false)

const providerConfigs: Record<string, { baseURL: string; model: string; name: string; imageMode?: string }> = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    name: 'OpenAI',
    imageMode: 'base64'
  },
  siliconflow: {
    baseURL: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    name: '硅基流动',
    imageMode: 'base64'
  },
  coze: {
    baseURL: 'https://api.coze.cn',
    model: '',
    name: 'Coze',
    imageMode: 'coze'
  },
  custom: {
    baseURL: '',
    model: '',
    name: '自定义',
    imageMode: 'base64'
  }
}

const currentProvider = computed(() => {
  return providerConfigs[apiSettings.value.provider]?.name || '自定义'
})

const welcomeMessage = computed(() => {
  return `与 文途智行 开始对话`
})

const loadSettings = () => {
  const saved = localStorage.getItem('ai-chat-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      console.log('加载到的 API 配置:', { ...parsed, apiKey: parsed.apiKey ? '***' : '未设置' })
      apiSettings.value = { ...apiSettings.value, ...parsed }
      
      // 兼容旧配置：如果没设置 imageMode，根据 provider 给默认值
      if (!apiSettings.value.imageMode) {
        apiSettings.value.imageMode = apiSettings.value.provider === 'coze' ? 'coze' : 'base64'
      }
      
      isSettingsLoaded.value = true
    } catch (e) {
      console.error('加载设置失败', e)
    }
  }
  isSettingsLoaded.value = true
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true
})

md.renderer.rules.link_open = function (tokens: any[], idx: number, options: any, env: any, self: any) {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, idx, options)
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const formatMessage = (text: string): string => {
  if (!text) return ''
  return md.render(text)
}

const formatAssistantMessage = (text: string): string => {
  if (!text) return ''
  // 移除地图数据标签后再渲染，避免显示原始标签
  const cleanText = text.replace(/\[MAP_DATA\][\s\S]*?\[\/MAP_DATA\]/g, '').trim()
  return md.render(cleanText)
}

const hasMapData = (text: string) => {
  return /\[MAP_DATA\][\s\S]*?\[\/MAP_DATA\]/.test(text)
}

const goToMap = (text: string) => {
  const match = text.match(/\[MAP_DATA\]([\s\S]*?)\[\/MAP_DATA\]/)
  if (match) {
    try {
      let rawJson = match[1].trim()
      
      // 1. 移除可能存在的 Markdown 代码块包裹
      if (rawJson.includes('```')) {
        rawJson = rawJson.replace(/```[a-z]*\n?/gi, '').replace(/\n?```/gi, '').trim()
      }
      
      // 2. 移除可能的非法字符（如末尾的多余逗号或文字）
      rawJson = rawJson.replace(/,(\s*[}\]])/g, '$1') // 移除末尾逗号
      
      const mapData = JSON.parse(rawJson)
      chatStore.currentMapData = mapData
      emit('navigate', 'mapPlanning')
    } catch (e) {
      console.error('解析地图数据失败:', e, '\n原始数据:', match[1])
      Snackbar.error('解析地图数据失败，请检查 AI 输出格式')
    }
  }
}

const handleNewLine = () => {
  inputText.value += '\n'
}

// 场景推荐按钮点击处理函数 (占位)
const handleSceneButtonClick = (btnIndex: number, btnText: string) => {
  console.log(`点击了场景按钮 ${btnIndex}: ${btnText}`)
  sceneDialogVisible.value = false
  
  // 隐藏发送用户的选择，格式为 JSON 字符串
  const hiddenPrompt = `[USER_CHOICE]{"value": "${btnText}"}[/USER_CHOICE]\n`
  handleSendHidden(hiddenPrompt).catch(err => {
    Snackbar.error('发送选择失败: ' + err.message)
  })
}

// 多选弹窗确认处理函数 (占位)
const handleSelectConfirm = () => {
  console.log('用户选择了:', selectedValues.value)
  const selections = [...selectedValues.value]
  selectDialogVisible.value = false
  
  // 隐藏发送用户的选择，格式为 JSON 数组
  const hiddenPrompt = `model:确定游览方案\n[USER_CHOICE]{"values": ${JSON.stringify(selections)}}[/USER_CHOICE]`
  handleSendHidden(hiddenPrompt).catch(err => {
    Snackbar.error('发送选择失败: ' + err.message)
  })
}

const clearChat = () => {
  if (messages.value.length === 0) return
  
  Dialog({
    title: '提示',
    message: '确定要清空当前聊天记录吗？',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  }).then((action) => {
    if (action === 'confirm') {
      chatStore.updateMessages([])
      Snackbar.success('聊天记录已清空')
    }
  })
}

// 侧边栏操作
const handleNewChat = () => {
  chatStore.createNewChat()
  drawer.value = false
  Snackbar.success('已开启新对话')
}

const handleSelectSession = (id: string) => {
  chatStore.switchChat(id)
  drawer.value = false
  scrollToBottom()
}

const handleRenameSession = (id: string, oldTitle: string) => {
  const value = window.prompt('请输入新的对话标题', oldTitle)
  if (value && value.trim()) {
    chatStore.renameChat(id, value.trim())
    Snackbar.success('重命名成功')
  }
}

const handleDeleteSession = (id: string) => {
  chatStore.deleteChat(id)
}

let currentAbortController: AbortController | null = null

const getOrCreateCozeUserId = () => {
  let userId = localStorage.getItem('coze_user_id')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).slice(2, 11)
    localStorage.setItem('coze_user_id', userId)
  }
  return userId
}

const extractResponseText = (payload: any) => {
  return payload?.choices?.[0]?.message?.content
    || payload?.choices?.[0]?.delta?.content
    || payload?.data?.content
    || payload?.message?.content
    || payload?.content
    || ''
}

const sendMessage = async (text: string, showUserMessage: boolean) => {
  if (!text || isLoading.value) return

  // 确保有一个活跃的会话
  if (!chatStore.currentSession) {
    chatStore.createNewChat()
  }

  // 每次发送前重新加载一次设置，确保读取到最新的 API Key
  loadSettings()

  if (!apiSettings.value.apiKey) {
    Snackbar.warning('请先在设置中配置 API Key')
    return
  }

  // 中断之前可能仍在进行的请求
  if (currentAbortController) {
    currentAbortController.abort()
  }
  const abortController = new AbortController()
  currentAbortController = abortController
  const signal = abortController.signal

  // 如果是隐藏发送（如画像），则不将其直接推入对话列表，但需要包含在请求中
  const currentMessages = [...messages.value]
  const requestMessages = currentMessages.map(m => ({
    role: m.role,
    content: m.content
  }))
  
  // 将当前消息加入请求列表
  requestMessages.push({ role: 'user', content: text })

  // 记录本次发送的图片（如果有）
  const currentImages = [...uploadedImages.value]
  
  // 清除输入区图片状态
  uploadedImages.value = []
  fileList.value = []

  const newMessages = [...messages.value]

  if (showUserMessage) {
    newMessages.push({ 
      role: 'user', 
      content: text,
      imageUrl: currentImages.length > 0 ? currentImages[0].url : '' // 目前 UI 仅支持显示一张，但后端可以支持多张
    })
    chatStore.updateMessages(newMessages)
    await scrollToBottom()
  }

  // 先在列表中推入一个空的助手回复，用于流式更新
  newMessages.push({ role: 'assistant', content: '' })
  chatStore.updateMessages(newMessages)
  const assistantMsgIndex = newMessages.length - 1
  
  isLoading.value = true

  try {
    const { baseURL, apiKey, model, provider, botId, imageMode } = apiSettings.value
    
    let finalBaseURL = (baseURL || providerConfigs[provider]?.baseURL || '').trim()
    if (!finalBaseURL) {
      throw new Error('API 地址不能为空，请在设置中配置正确的 API 地址')
    }

    // 格式化 URL
    finalBaseURL = finalBaseURL.replace(/\/+$/, '').replace(/\/v3\/chat$/, '')

    let aiContent = ''

    if (imageMode === 'coze') {
      if (!botId) throw new Error('Coze 模式下必须配置 Bot ID')
      const cleanBotId = botId.trim()
      const cleanApiKey = apiKey.trim()
      
      // 构建 Coze 多模态内容 (object_string)
      const contentList: any[] = [{ type: 'text', text: text }]
      currentImages.forEach(img => {
        contentList.push({ type: 'image', file_id: img.id })
      })

      const additionalMessages = requestMessages.slice(0, -1).map(message => ({
        role: message.role,
        content: message.content,
        content_type: 'text'
      }))

      additionalMessages.push({
        role: 'user',
        content: JSON.stringify(contentList),
        content_type: 'object_string'
      })

      const response = await fetch(`${finalBaseURL}/v3/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bot_id: cleanBotId,
          user_id: getOrCreateCozeUserId(),
          additional_messages: additionalMessages,
          stream: true
        }),
        signal
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(`Coze API 错误: ${response.status} ${JSON.stringify(errData)}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('无法读取响应流')

      let buffer = ''
      let currentEvent = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (buffer.trim() && !aiContent) {
            try {
              const fallbackData = JSON.parse(buffer.trim())
              if (fallbackData.error || (typeof fallbackData.code !== 'undefined' && fallbackData.code !== 0)) {
                throw new Error(`接口隐式报错: ${JSON.stringify(fallbackData)}`)
              }
              aiContent = extractResponseText(fallbackData) || JSON.stringify(fallbackData)
              newMessages[assistantMsgIndex].content = aiContent
              chatStore.updateMessages(newMessages)
            } catch (err: any) {
              if (err.message.includes('接口隐式报错')) {
                throw err
              }
              console.warn('尝试非流式兜底解析失败:', err, buffer)
            }
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // 保留最后一行（可能是残缺的）
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue
          
          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.slice(6).trim()
          } else if (trimmedLine.startsWith('data:')) {
            const dataContent = trimmedLine.slice(5).trim()
            if (dataContent === '[DONE]') continue
            if (!dataContent) continue

            try {
              const data = JSON.parse(dataContent)
              
              if (
                currentEvent === 'conversation.message.delta'
                || currentEvent === 'conversation.message.completed'
              ) {
                // Coze 返回的 type='answer' 才属于真正的回答内容
                if (data.type && data.type !== 'answer') {
                  continue
                }
                const delta = data.content || data.message?.content || data.choices?.[0]?.delta?.content || ''
                if (delta) {
                  // 过滤掉内部流式标记，例如 {"msg_type":"generate_answer_finish"} 这种
                  if (delta.includes('"msg_type"') || delta.includes('"generate_answer_finish"')) {
                    continue
                  }
                  if (currentEvent === 'conversation.message.completed' && aiContent.includes(delta)) {
                    continue
                  }
                  aiContent += delta
                  newMessages[assistantMsgIndex].content = aiContent
                  chatStore.updateMessages(newMessages)
                  scrollToBottom()
                }
              } else if (currentEvent === 'error' || data.event === 'error' || (data.code !== undefined && data.code !== 0)) {
                const errorMsg = data.msg || data.message || JSON.stringify(data)
                throw new Error(`AI 流式错误: ${errorMsg}`)
              }
              // Coze 其它事件（如 conversation.chat.created/in_progress 等），不抛出错误，直接跳过

            } catch (e: any) {
              if (e.message.includes('AI 流式错误')) throw e
              console.warn('JSON 片段解析失败，可能并非错误:', e.message, dataContent)
            }
          }
        }
      }
    } else {
      const cleanApiKey = apiKey.trim()
      const cleanModel = model.trim()
      // OpenAI 兼容 API 流式 (支持 Base64 多模态)
      let finalMessages: any[] = [...requestMessages]
      
      // 如果有图片，替换最后一条消息为多模态格式
      if (currentImages.length > 0) {
        const lastMsg = finalMessages.pop()
        const content: any[] = [{ type: 'text', text: lastMsg?.content || text }]
        currentImages.forEach(img => {
          if (img.id.startsWith('data:image')) {
            content.push({ 
              type: 'image_url', 
              image_url: { url: img.id } 
            })
          }
        })
        finalMessages.push({
          role: 'user',
          content: content
        })
      }

      const response = await fetch(`${finalBaseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanApiKey}`
        },
        body: JSON.stringify({
          model: cleanModel,
          messages: finalMessages,
          stream: true
        }),
        signal
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(`API 错误: ${response.status} ${JSON.stringify(errData)}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('无法读取响应流')

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (buffer.trim() && !aiContent) {
            try {
              const fallbackData = JSON.parse(buffer.trim())
              if (fallbackData.error || (typeof fallbackData.code !== 'undefined' && fallbackData.code !== 0)) {
                throw new Error(`接口隐式报错: ${JSON.stringify(fallbackData)}`)
              }
              aiContent = extractResponseText(fallbackData) || JSON.stringify(fallbackData)
              newMessages[assistantMsgIndex].content = aiContent
              chatStore.updateMessages(newMessages)
            } catch (err: any) {
              if (err.message.includes('接口隐式报错')) {
                throw err
              }
              console.warn('尝试 OpenAI 兼容接口的非流式兜底解析失败:', err, buffer)
            }
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue
          
          const dataStr = trimmedLine.slice(5).trim()
          if (dataStr === '[DONE]') break
          
          try {
            const data = JSON.parse(dataStr)
            const delta = data.choices?.[0]?.delta?.content || ''
            if (delta) {
              aiContent += delta
              newMessages[assistantMsgIndex].content = aiContent
              chatStore.updateMessages(newMessages)
              scrollToBottom()
            }
          } catch (e: any) {
            console.warn('OpenAI 兼容接口 JSON 片段解析失败，可能并非错误:', e.message, dataStr)
          }
        }
      }
    }

    if (!aiContent) {
      aiContent = 'AI 未返回有效回复'
      newMessages[assistantMsgIndex].content = aiContent
      chatStore.updateMessages(newMessages)
    }

    // 处理解析场景推荐数据 [SCENE_DATA]{...}[/SCENE_DATA]
    // 注意：流式结束后再进行解析，因为标签可能被拆分在不同 chunk 中
    const sceneDataMatch = aiContent.match(/\[SCENE_DATA\]([\s\S]*?)\[\/SCENE_DATA\]/)
    if (sceneDataMatch) {
      try {
        const rawJson = sceneDataMatch[1]
        const parsedData = JSON.parse(rawJson)
        sceneButtons.value = {
          description: parsedData.description || '',
          btn1: parsedData.btn1 || '',
          btn2: parsedData.btn2 || '',
          btn3: parsedData.btn3 || ''
        }
        sceneDialogVisible.value = true
        newMessages[assistantMsgIndex].content = aiContent.replace(/\[SCENE_DATA\][\s\S]*?\[\/SCENE_DATA\]/, '').trim()
        chatStore.updateMessages(newMessages)
      } catch (e) {
        console.error('解析 SCENE_DATA 失败:', e)
      }
    }

    const selectDataMatch = aiContent.match(/\[SELECT_DATA\]([\s\S]*?)\[\/SELECT_DATA\]/)
    if (selectDataMatch) {
      try {
        const rawJson = selectDataMatch[1]
        const parsedData = JSON.parse(rawJson)
        if (Array.isArray(parsedData.options)) {
          selectOptions.value = parsedData.options
          selectDescription.value = parsedData.description || ''
          selectedValues.value = []
          selectDialogVisible.value = true
          newMessages[assistantMsgIndex].content = aiContent.replace(/\[SELECT_DATA\][\s\S]*?\[\/SELECT_DATA\]/, '').trim()
          chatStore.updateMessages(newMessages)
        }
      } catch (e) {
        console.error('解析 SELECT_DATA 失败:', e)
      }
    }
    
  } catch (error: any) {
    if (error?.name === 'AbortError' || String(error?.message || '').toLowerCase().includes('abort')) {
      console.log('用户中断了上一次请求')
      return
    }
    console.error('发送消息失败:', error)
    let errorMsg = error?.message || String(error)
    
    // 特殊处理 Coze 认证等接口隐式报错
    if (errorMsg.includes('接口隐式报错')) {
      try {
        const errObjStr = errorMsg.replace('接口隐式报错:', '').trim()
        const errObj = JSON.parse(errObjStr)
        if (errObj.msg) {
          errorMsg = errObj.msg
        }
      } catch (e) {
        // 保持原样
      }
    }
    
    if (errorMsg === 'Failed to fetch' || error?.name === 'TypeError') {
      errorMsg = '网络连接中断，请检查网络设置。如果是本地大模型服务（如Ollama），请确保手机端配置的是电脑局域网IP（如192.168.x.x）而不是 localhost。'
    }
    newMessages[assistantMsgIndex].content = `❌ 请求失败：${errorMsg}\n\n请检查设置或网络。`
    chatStore.updateMessages(newMessages)
  } finally {
    isLoading.value = false
    if (currentAbortController === abortController) {
      currentAbortController = null
    }
    await scrollToBottom()
  }
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return
  inputText.value = ''
  
  const enableModePrefix = localStorage.getItem('enable-mode-prefix') !== 'false' // 默认开启
  const prefix = enableModePrefix ? modeOptionsBtnGroup.value : ''
  const prefixedText = prefix && !text.startsWith(`${prefix}\n`) ? `${prefix}\n${text}` : text
  
  await sendMessage(prefixedText, true)
}

const handleSendHidden = async (text: string) => {
  if (isLoading.value) {
    throw new Error('AI 正在处理上一条消息，请稍后')
  }
  await sendMessage(text, false)
}

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  await loadSettings()
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 300))
  checkAndSendInitialPrompt()
  checkAndSendUserProfile()
  checkAndSendSocialRequest()
  checkAndSendMapConfirm()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(() => props.activeTab, (newTab) => {
  if (newTab === 'aiDialogue') {
    loadSettings() // 切换到 AI 页面时重新加载配置
    checkAndSendInitialPrompt()
    checkAndSendUserProfile()
    checkAndSendSocialRequest()
    checkAndSendMapConfirm()
  }
})

const checkAndSendMapConfirm = () => {
  const pendingConfirm = localStorage.getItem('pending-map-confirm')
  if (pendingConfirm) {
    sendMapConfirmWithRetry(pendingConfirm)
  }
}

const sendMapConfirmWithRetry = async (message: string) => {
  const maxRetries = 3
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 800 + i * 500))
      await handleSendHidden(message)
      localStorage.removeItem('pending-map-confirm')
      console.log('行程确认消息发送成功')
      return true
    } catch (error) {
      console.error(`发送行程确认消息失败，第 ${i + 1} 次尝试:`, error)
    }
  }
  return false
}

const checkAndSendInitialPrompt = () => {
  const pendingPrompt = localStorage.getItem('pending-initial-prompt')
  const shouldAutoSend = localStorage.getItem('should-auto-send-prompt') === 'true'
  
  if (pendingPrompt) {
    if (shouldAutoSend) {
      // 只有从设置页面点击按钮过来时，才自动发送
      sendInitialPromptWithRetry(pendingPrompt)
      console.log('检测到跳转指令，开始自动发送提示词')
    } else {
      // 否则（如刚进入软件时），仅填入输入框，不自动发送
      inputText.value = pendingPrompt
      console.log('检测到缓存提示词，已填入输入框')
    }
    // 无论哪种情况，都清除自动发送标记，防止刷新页面重复触发
    localStorage.removeItem('should-auto-send-prompt')
    localStorage.removeItem('pending-initial-prompt')
  }
}

const sendInitialPromptWithRetry = async (prompt: string) => {
  const maxRetries = 3
  for (let i = 0; i < maxRetries; i++) {
    try {
      // 等待设置加载完成
      await new Promise(resolve => setTimeout(resolve, 800 + i * 500))
      await handleSendHidden(prompt)
      console.log('初始化提示词自动发送成功')
      return true
    } catch (error) {
      console.error(`自动发送初始化提示词失败，第 ${i + 1} 次尝试:`, error)
    }
  }
  return false
}

const checkAndSendSocialRequest = () => {
  const socialPrompt = localStorage.getItem('social-post-request')
  if (socialPrompt) {
    sendSocialRequestWithRetry(socialPrompt)
  }
}

const sendSocialRequestWithRetry = async (prompt: string) => {
  const maxRetries = 5
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000 + i * 800))
      await handleSendHidden(prompt)
      localStorage.removeItem('social-post-request')
      console.log('社交发布请求发送成功')
      return true
    } catch (error) {
      console.error(`发送社交发布请求失败，第 ${i + 1} 次尝试:`, error)
    }
  }
  return false
}

const checkAndSendUserProfile = () => {
  const savedForm = localStorage.getItem('user-profile-form')
  if (savedForm) {
    try {
      const formData = JSON.parse(savedForm)
      
      const prompt = `model:用户画像\n
                      请根据以下用户画像信息，生成一个详细的用户画像总结，后续对话时用于推荐旅游景点：\n
                      1. 旅行人数（travelNumber）: ${formData.travelNumber || '未填写'} 人\n
                      2. 旅行天数（travelDays）: ${formData.travelDays || '未填写'} 天\n
                      3. 旅行预算（travelBudget）: ${formData.travelBudget || '未填写'} 元\n
                      4. 出行风格（travelStyle）: ${formData.travelStyle || '未填写'}\n
                      5. 行程核心关注点（travelFocus）: ${Array.isArray(formData.travelFocus) ? formData.travelFocus.join('、') : (formData.travelFocus || '未填写')}\n
                      6. 个性化出行习惯（customHabit）: ${(Array.isArray(formData.customHabit) ? formData.customHabit.join('、') : (formData.customHabit || '未填写')) + '。' + formData.additionalRequirements}\n
                      7. 出发日期（startDate）: ${formData.startDate || '未填写'}\n
                      8. 出行方式（travelMethod）: ${formData.travelMethod || '未填写'}\n
                      9. 出发地（originPlace）: ${formData.originPlace || '未填写'}\n
                      请调用你的工作流进行用户喜好分析，下面的对话内容要基于此进行。明白回复我：我已读取用户画像，下面根据你的喜好进行对话咨询。`
      
      sendUserProfileWithRetry(prompt)
    } catch (e) {
      console.error('加载用户画像失败', e)
    }
  }
}

const sendUserProfileWithRetry = async (prompt: string) => {
  const maxRetries = 5
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000 + i * 800))
      await handleSendHidden(prompt)
      localStorage.removeItem('user-profile-form')
      console.log('用户画像发送成功')
      return true
    } catch (error) {
      console.error(`发送用户画像失败，第 ${i + 1} 次尝试:`, error)
      if (i === maxRetries - 1) {
        console.error('用户画像发送最终失败，数据保留在 localStorage 中')
      }
    }
  }
  return false
}
</script>

<style scoped>
.ai-dialogue-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  --chat-page-bg: transparent;
  --chat-surface: rgba(255, 255, 255, 0.92);
  --chat-surface-muted: #f4f6f8;
  --chat-surface-accent: rgba(64, 158, 255, 0.12);
  --chat-border: rgba(15, 23, 42, 0.1);
  --chat-border-strong: rgba(15, 23, 42, 0.16);
  --chat-text-primary: rgba(17, 24, 39, 0.92);
  --chat-text-secondary: rgba(17, 24, 39, 0.62);
  --chat-user-bubble-bg: #9df29f;
  --chat-user-bubble-text: #0f172a;
  --chat-assistant-bubble-bg: #eeeff3;
  --chat-assistant-bubble-text: rgba(17, 24, 39, 0.92);
  --chat-input-bg: rgba(255, 255, 255, 0.96);
  --chat-danger: #ff5f6d;
  color: var(--chat-text-primary);
}

html.dark .ai-dialogue-page {
  --chat-page-bg: transparent;
  --chat-surface: rgba(35, 37, 39, 0.96);
  --chat-surface-muted: #2c2f33;
  --chat-surface-accent: rgba(76, 175, 255, 0.18);
  --chat-border: rgba(255, 255, 255, 0.09);
  --chat-border-strong: rgba(255, 255, 255, 0.14);
  --chat-text-primary: rgba(244, 247, 250, 0.94);
  --chat-text-secondary: rgba(244, 247, 250, 0.68);
  --chat-user-bubble-bg: #35d28d;
  --chat-user-bubble-text: #04150d;
  --chat-assistant-bubble-bg: #2f2f30;
  --chat-assistant-bubble-text: #d4d4d7;
  --chat-input-bg: rgba(29, 30, 31, 0.98);
  --chat-danger: #ff7b86;
}

.chat-input-container {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  position: fixed;
  bottom: calc(65px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  z-index: 100;
  pointer-events: none; /* 让预览区域不阻挡点击，子元素再恢复 */
}

.chat-input-container.input-focused {
  bottom: 0;
  z-index: 1001;
}

.gemini-input-pill {
  display: flex;
  align-items: center;
  background: var(--chat-input-bg);
  border-radius: 32px;
  padding: 6px 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--chat-border);
  backdrop-filter: blur(20px);
  pointer-events: auto;
  min-height: 56px;
  gap: 8px;
}

/* 左侧：功能组合区 */
.left-action-group {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.secondary-icon-btn {
  color: var(--chat-text-secondary);
  width: 38px;
  height: 38px;
  padding: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 模式按钮特化：使用品牌色增强识别度 */
.mode-btn {
  color: #A8A7FE !important; /* 柔和的紫色，代表 AI/智能 */
}

/* 上传按钮特化：略微提亮 */
.upload-btn {
  color: var(--chat-text-primary) !important;
  opacity: 0.85;
}

html.dark .secondary-icon-btn {
  background: rgba(255, 255, 255, 0.04); /* 暗色模式下增加极淡的底色 */
}

html.dark .mode-btn {
  color: #C1C0FF !important; /* 暗色模式下使用更亮的紫色 */
}

html.dark .upload-btn {
  color: #ffffff !important;
}

.secondary-icon-btn:hover {
  transform: scale(1.08);
  background: rgba(var(--color-primary-rgb), 0.12);
}

html.dark .secondary-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.secondary-icon-btn:active {
  transform: scale(0.95);
}

.vertical-divider {
  width: 1px;
  height: 20px;
  background: var(--chat-border);
  margin: 0 4px;
  opacity: 0.6;
}

html.dark .vertical-divider {
  background: rgba(255, 255, 255, 0.2);
  opacity: 0.8;
}

.mode-icon {
  filter: drop-shadow(0 0 2px rgba(var(--color-primary-rgb), 0.2));
  transition: transform 0.3s ease;
}

.mode-btn:hover .mode-icon {
  transform: rotate(15deg);
}

.icon-stack {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.sub-icon {
  position: absolute;
  bottom: -2px;
  right: -4px;
  color: #ffffff;
  background: #A8A7FE;
  border-radius: 50%;
  padding: 1px;
  border: 1px solid var(--chat-input-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

html.dark .sub-icon {
  background: #83CFF9;
  border-color: #1d1e1f;
}

.mode-popover {
  background: var(--chat-input-bg);
  border-radius: 20px;
  padding: 8px;
  border: 1px solid var(--chat-border);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  min-width: 150px;
  backdrop-filter: blur(20px);
}

.mode-popover-item {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  color: var(--chat-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.mode-popover-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--chat-text-primary);
}

.mode-popover-item.active {
  background: var(--color-primary);
  color: #ffffff;
}

/* 输入区域 */
.input-area {
  flex: 1;
  min-width: 0;
}

.pill-textarea {
  --field-decorator-standard-padding-top: 0;
  --field-decorator-standard-padding-bottom: 0;
}

.pill-textarea :deep(textarea) {
  font-size: 16px;
  color: var(--chat-text-primary);
  line-height: 1.4;
  padding: 10px 0;
  max-height: 120px;
}

.pill-textarea :deep(.var-field-decorator__placeholder) {
  font-size: 14px;
  color: var(--chat-text-secondary);
  opacity: 0.8;
}

html.dark .pill-textarea :deep(.var-field-decorator__placeholder) {
  color: rgba(255, 255, 255, 0.5);
}

/* 右侧：动作区 */
.right-action-area {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.send-idle-icon {
  transform: rotate(-15deg);
  opacity: 0.7;
}

.main-action {
  width: 42px;
  height: 42px;
}

.send-pill-btn {
  width: 42px;
  height: 42px;
  padding: 0;
  background: linear-gradient(135deg, #83CFF9 0%, #A8A7FE 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(131, 207, 249, 0.4), 
              inset 0 1px 1px rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  --button-loading-icon-size: 20px; /* 缩小按钮内置 loading 图标 */
}

.send-svg-icon {
  transform: rotate(-15deg) translateX(1px);
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.15));
  transition: transform 0.3s ease;
}

.send-pill-btn:hover .send-svg-icon {
  transform: rotate(0deg) scale(1.1);
}

.send-pill-btn:active {
  transform: scale(0.95);
}

/* 图片预览浮窗 */
.image-preview-floating {
  align-self: flex-start;
  margin-left: 54px; /* 对齐左侧上传按钮中心 */
  margin-bottom: 8px;
  pointer-events: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.var-uploader--outline-none :deep(.var-uploader__action) {
  outline: none;
}

.image-preview-floating .image-preview-wrapper {
  position: relative;
  width: 44px; /* 缩小预览图尺寸 */
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  border: 1.5px solid var(--color-primary);
  background: var(--chat-input-bg);
}

.image-preview-floating .remove-image-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ffffff;
  border-radius: 50%;
  color: var(--chat-danger);
  font-size: 14px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 2;
}

html.dark .image-preview-floating .remove-image-btn {
  background: #1d1e1f;
}

.image-preview-floating .upload-loading-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(1px);
}

.image-preview-floating :deep(.var-loading) {
  --loading-circle-size: 16px; /* 缩小上传中的 loading 图标 */
}

/* 动画 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--chat-page-bg);
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: var(--chat-input-bg);
  border-bottom: 1px solid var(--chat-border);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.history-btn {
  margin-right: 8px;
  color: var(--color-primary);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary);
}

.header-spacer {
  flex: 1;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  padding-bottom: 100px; /* 为浮动输入框留出空间 */
  min-height: 0;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  max-width: 80%;
  position: relative;
}

.message-tools {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s;
  padding: 0 4px;
}

.message-text {
  word-break: break-word;
}

/* Markdown 样式优化 */
.markdown-body {
  line-height: 1.6;
}

.markdown-body :deep(p) {
  margin: 0 0 8px 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 12px 0 8px 0;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
}

.markdown-body :deep(pre) {
  padding: 12px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: rgba(175, 184, 193, 0.1);
  border-radius: 8px;
  margin: 8px 0;
}

.markdown-body :deep(pre code) {
  padding: 0;
  margin: 0;
  background-color: transparent;
  border: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
}

.markdown-body :deep(blockquote) {
  padding: 0 1em;
  color: var(--chat-text-secondary);
  border-left: 0.25em solid var(--chat-border);
  margin: 8px 0;
}

.markdown-body :deep(table) {
  display: block;
  width: 100%;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  border-spacing: 0;
  border-collapse: collapse;
  margin: 8px 0;
}

.markdown-body :deep(table tr) {
  background-color: transparent;
  border-top: 1px solid var(--chat-border);
}

.markdown-body :deep(table th),
.markdown-body :deep(table td) {
  padding: 6px 13px;
  border: 1px solid var(--chat-border);
}

.markdown-body :deep(a) {
  color: var(--color-primary);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.message-item:hover .message-tools {
  opacity: 1;
  visibility: visible;
}

.message-item.user .message-tools {
  justify-content: flex-end;
}

.message-edit-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.map-action-wrapper {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--chat-border);
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .chat-messages {
    padding: 10px;
    padding-bottom: 110px;
  }
  
  .chat-input-container {
    padding: 8px 12px;
  }
  
  .message-content {
    max-width: 90%;
  }

  .gemini-input-pill {
    min-height: 48px;
    padding: 4px 8px;
    gap: 4px;
  }

  .secondary-icon-btn {
    width: 34px;
    height: 34px;
  }

  .vertical-divider {
    height: 16px;
    margin: 0 2px;
  }

  .pill-textarea :deep(textarea) {
    font-size: 14px;
    padding: 8px 0;
  }

  .main-action {
    width: 36px;
    height: 36px;
  }

  .send-pill-btn {
    width: 36px;
    height: 36px;
  }

  .send-icon {
    font-size: 20px !important;
  }

  .image-preview-floating {
    margin-left: 42px;
    margin-bottom: 6px;
  }

  .image-preview-floating .image-preview-wrapper {
    width: 36px;
    height: 36px;
    border-radius: 6px;
  }
  
  .image-preview-floating :deep(.var-loading) {
    --loading-circle-size: 14px;
  }
  
  .scene-btn {
    font-size: 14px;
    padding: 15px 0;
  }
  
  .message-avatar {
    display: none;
  }

  .message-item {
    justify-content: center;
  }

  .message-item.user {
    flex-direction: row;
  }

  .message-content {
    max-width: 95%;
  }

  .message-role {
    text-align: center;
  }

  .message-item.user .message-tools {
    justify-content: center;
  }
}

.message-role {
  font-size: 12px;
  color: var(--chat-text-secondary);
  margin-bottom: 5px;
}

.message-item.user .message-role {
  text-align: right;
}

.message-card {
  border-radius: 12px;
  padding: 12px 16px;
  border: 1px solid var(--chat-border);
}

.message-image-wrapper {
  margin-bottom: 8px;
  width: 50px;
  height: 50px;
}

.message-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  cursor: zoom-in;
}

.message-text {
  line-height: 1.6;
  word-break: break-word;
}

.message-text :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 8px 0;
  display: block;
}

.loading-card {
  display: flex;
  align-items: center;
  gap: 10px;
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.chat-input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.collapsible-area {
  max-height: 0;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateY(10px);
}

.collapsible-area.expanded {
  max-height: 200px;
  opacity: 1;
  transform: translateY(0);
  margin-bottom: 8px;
}

.toggle-toolbar-btn {
  margin-bottom: 6px;
  color: var(--chat-text-secondary);
  transition: all 0.3s;
  padding: 0;
  min-width: 32px;
  height: 32px;
}

.toggle-toolbar-btn:hover {
  color: var(--color-primary);
}

.chat-textarea {
  flex: 1;
  min-width: 0;
}

.chat-textarea :deep(textarea) {
  font-size: 14px;
  line-height: 1.45;
}

.chat-textarea :deep(.var-field-decorator) {
  min-height: 38px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.chat-toolbar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}

.chat-toolbar .var-button,
.chat-actions .var-button,
.map-action-wrapper .var-button,
.edit-actions .var-button,
.scene-btn,
.select-dialog .var-button {
  border-radius: 0 !important;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.new-chat-container {
  padding: 0 16px 16px 16px;
}

.new-chat-btn {
  width: 100%;
  height: 40px;
  font-weight: bold;
}

.toolbar-label {
  font-size: 14px;
  color: var(--chat-text-secondary);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: var(--chat-surface-muted);
  border: 1px solid transparent;
}

.history-item:hover {
  background-color: var(--chat-surface);
}

.history-item.active {
  background-color: var(--chat-surface-accent);
  border-color: var(--color-primary);
}

.history-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.history-item-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--chat-text-primary);
}

.history-item-actions {
  display: flex;
  gap: 0px;
  opacity: 1; /* 改为一直显示 */
  transition: opacity 0.3s;
  flex-shrink: 0;
}

.history-item:hover .history-item-actions {
  opacity: 1;
}

.history-action-btn {
  width: 32px;
  height: 32px;
  min-width: 32px;
  transition: all 0.2s ease;
  color: var(--chat-text-secondary);
}

.rename-btn:hover {
  background-color: rgba(0, 0, 0, 0.05) !important;
  color: var(--color-primary) !important;
}

.rename-btn:active {
  background-color: rgba(0, 0, 0, 0.1) !important;
}

html.dark .rename-btn:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: var(--color-primary) !important;
}

.drawer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.chat-toolbar-upload {
  display: inline-flex;
  align-items: center;
}

.chat-toolbar-upload :deep(.var-uploader__action) {
  display: flex;
  align-items: center;
  margin: 0;
}

.image-preview-container {
  padding: 8px;
  background: var(--chat-surface-muted);
  border-radius: 8px;
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
}

.image-preview-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
}

.image-preview {
  width: 100%;
  height: 100%;
  border-radius: 4px;
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  cursor: pointer;
  color: var(--chat-danger);
  background: var(--chat-input-bg);
  border-radius: 50%;
  font-size: 18px;
}

.upload-loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--chat-text-secondary);
}

.chat-actions {
  display: flex;
  align-self: flex-end;
}

.empty-tip {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding-bottom: 15vh; /* 略微上移，视觉中心更平衡 */
}

.result-empty :deep(.var-result__image) {
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border: 4px solid var(--chat-surface);
}

.result-empty :deep(.var-result__title) {
  margin-top: 20px;
  font-size: 18px;
  font-weight: 500;
  color: var(--chat-text-secondary);
}

html.dark .chat-container {
  background: transparent;
}

.message-card.user {
  background: var(--chat-user-bubble-bg);
  border-color: transparent;
}

.message-card.user .message-text {
  color: var(--chat-user-bubble-text);
}

.message-card.assistant .message-text {
  color: var(--chat-assistant-bubble-text);
  line-height: 1.45;
}

.message-card.assistant .message-text :deep(p) {
  margin: 0 0 6px 0;
}

.message-card.assistant .message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-card.assistant .message-text :deep(ul),
.message-card.assistant .message-text :deep(ol) {
  margin: 0 0 6px 0;
  padding-left: 18px;
}

.message-card.assistant .message-text :deep(li) {
  margin: 2px 0;
}

.message-card.assistant .message-text :deep(pre) {
  margin: 6px 0;
}

.message-card.assistant .message-text :deep(blockquote) {
  margin: 6px 0;
}

.message-card.assistant .message-text :deep(h1),
.message-card.assistant .message-text :deep(h2),
.message-card.assistant .message-text :deep(h3),
.message-card.assistant .message-text :deep(h4),
.message-card.assistant .message-text :deep(h5),
.message-card.assistant .message-text :deep(h6) {
  margin: 8px 0 6px 0;
  line-height: 1.25;
}

/* ========= 可自定义：用户聊天框（浅色模式）颜色 =========
  - 修改用户气泡背景：background
  - 修改用户气泡边框：border-color
  - 修改用户文字颜色：配合 .message-card.user .message-text 一起改

  例如（取消注释并改颜色值）：
  .message-card.user {
    background: #409eff;
    border-color: #409eff;
  }
*/

.message-card.assistant {
  background: var(--chat-assistant-bubble-bg);
}

html.dark .message-card.user {
  background: var(--chat-user-bubble-bg);
  border-color: transparent;
}

html.dark .message-card.assistant {
  background: var(--chat-assistant-bubble-bg);
  border-color: var(--chat-border);
}

html.dark .message-card.user .message-text {
  color: var(--chat-user-bubble-text);
}

html.dark .message-card.assistant .message-text {
  color: var(--chat-assistant-bubble-text);
}

/* ========= 可自定义：用户聊天框（深色模式）颜色 =========
  例如（取消注释并改颜色值）：
  html.dark .message-card.user {
    background: #409eff;
    border-color: #409eff;
  }
*/

/* ========= 可自定义：AI聊天框（深色模式）颜色 =========
  例如（取消注释并改颜色值）：
  html.dark .message-card.assistant {
    background: #1d2a4d;
    border-color: #0f3460;
  }
*/


html.dark .chat-input {
  background: var(--chat-input-bg);
  border-top-color: var(--chat-border);
}

.scene-buttons-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}

.scene-btn {
  width: 100%;
  margin-left: 0 !important;
  font-size: 16px;
  padding: 20px 0;
  border-radius: 8px;
}

.dialog-desc-card {
  margin-bottom: 20px;
  background-color: var(--chat-surface-muted);
  border: none;
}

.dialog-desc-text {
  font-size: 15px;
  line-height: 1.6;
  color: var(--chat-text-primary);
  white-space: pre-wrap;
}

.select-options-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 450px;
  overflow-y: auto;
  padding-right: 8px;
}

/* 优化多选列表滚动条样式 */
.select-options-container::-webkit-scrollbar {
  width: 6px;
}

.select-options-container::-webkit-scrollbar-thumb {
  background-color: var(--chat-border-strong);
  border-radius: 3px;
}

.select-options-container::-webkit-scrollbar-track {
  background-color: transparent;
}

.select-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.select-checkbox-item {
  width: 100%;
  margin-left: 0 !important;
  margin-right: 0 !important;
  height: auto !important;
  padding: 12px 20px !important;
}

.select-dialog-footer {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}
</style>
