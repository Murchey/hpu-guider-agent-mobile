import { ref } from 'vue'
import { defineStore } from 'pinia'
import { StyleProvider, Themes } from '@varlet/ui'

export const useThemeStore = defineStore('theme', () => {
  const isDarkMode = ref(false)

  const applyTheme = (isDark: boolean) => {
    isDarkMode.value = isDark
    document.documentElement.classList.toggle('dark', isDark)
    document.body.classList.toggle('dark', isDark)
    StyleProvider(isDark ? Themes.dark : null)
    localStorage.setItem('theme-mode', isDark ? 'dark' : 'light')
  }

  const loadTheme = () => {
    const saved = localStorage.getItem('theme-mode')
    isDarkMode.value = saved === 'dark'
    applyTheme(isDarkMode.value)
  }

  const toggleTheme = () => {
    applyTheme(!isDarkMode.value)
  }

  return {
    isDarkMode,
    applyTheme,
    loadTheme,
    toggleTheme
  }
})
