'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getThemePreference, updateThemePreference } from '@/app/projects/actions-sprint2'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextType = {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: async () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')

  // Load initial theme from localStorage (cache) or database
  useEffect(() => {
    // 1. Read cache first
    try {
      const cached = localStorage.getItem('nextq-theme-preference') as Theme | null
      if (cached === 'light' || cached === 'dark' || cached === 'system') {
        setThemeState(cached)
        applyTheme(cached)
      }
    } catch (e) {}

    // 2. Fetch authenticated user's theme preference from DB
    getThemePreference().then((dbTheme) => {
      if (dbTheme && (dbTheme === 'light' || dbTheme === 'dark' || dbTheme === 'system')) {
        setThemeState(dbTheme)
        applyTheme(dbTheme)
        try {
          localStorage.setItem('nextq-theme-preference', dbTheme)
        } catch (e) {}
      }
    })
  }, [])

  const applyTheme = (t: Theme) => {
    try {
      const root = document.documentElement
      if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    } catch (e) {}
  }

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    
    // Save to localStorage cache immediately
    try {
      localStorage.setItem('nextq-theme-preference', newTheme)
    } catch (e) {}

    // Save to database via secure server action
    await updateThemePreference(newTheme)
  }

  // Handle system preference changes if theme is set to 'system'
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      applyTheme('system')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
