import { useColorScheme } from 'react-native'

export const useSystemColors = () => {
  const scheme = useColorScheme()

  const isDark = scheme === 'dark'

  return {
    primary: isDark ? '#187e14ff' : '#40db19ff',
    primaryText: '#eef2f6e1',
    info: isDark ? '#000000' : '#ffffff',
    infoBorder: isDark ? '#1e881bff' : '#40db19ff',
    background: isDark ? '#222222' : '#f2f2f2',
    secondary: isDark ? '#000000' : '#ffffff',
    error: isDark ? '#8b0b0bff' : '#d62525ff',
    success: isDark ? '#07640cff' : '#0bc42aff',
    text: isDark ? '#ffffff' : '#000000',
    textInverse: isDark ? '#000000' : '#ffffff',
    textX: isDark ? '#187e14ff' : '#40db19ff',
    tabIcon: isDark ? '#ffffff' : 'steelblue',
    statusbar: isDark ? '#222222' : '#f2f2f2'
  }
}