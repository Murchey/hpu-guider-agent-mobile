import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Varlet, { StyleProvider, Themes } from '@varlet/ui'
import '@varlet/ui/es/style'

import App from './App.vue'
 
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(Varlet)

const applyTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle('dark', isDark)
  document.body.classList.toggle('dark', isDark)
  StyleProvider(isDark ? Themes.dark : null)
}

const saved = localStorage.getItem('theme-mode')
applyTheme(saved === 'dark')

app.mount('#app')
