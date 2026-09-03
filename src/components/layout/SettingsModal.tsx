'use client'

import React, { useState } from 'react'
import { useTheme } from '../theme/ThemeProvider'

interface SettingsModalProps {
  onClose: () => void
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'general'>('general')
  const [isSaving, setIsSaving] = useState(false)

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setIsSaving(true)
    await setTheme(newTheme)
    setIsSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[var(--surface-2)] backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl h-[450px] bg-[var(--bg)]ard border border-border rounded-2xl shadow-2xl flex overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Left Tabs Sidebar */}
        <aside className="w-48 bg-slate-50 dark:bg-[var(--surface-1)] border-r border-border p-4 flex flex-col gap-1 select-none">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
            Settings
          </h2>
          
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2.5 transition-all ${
              activeTab === 'general'
                ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/10 text-[var(--accent-text)] dark:text-[var(--accent-text)] font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            General
          </button>
        </aside>

        {/* Right Settings Content */}
        <main className="flex-1 flex flex-col justify-between p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground">General Settings</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage your personal preferences for this account.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Appearance Section */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Appearance</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select how NextQ Designer Suite should appear on this device.
                </p>
              </div>

              {/* Theme Choices Cards */}
              <div className="grid grid-cols-3 gap-3">
                {/* Light Theme Option */}
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`border rounded-xl p-3 text-left transition-all relative flex flex-col justify-between h-24 ${
                    theme === 'light'
                      ? 'border-[var(--accent)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/5 ring-1 ring-indigo-500'
                      : 'border-border bg-slate-50 dark:bg-[var(--surface-1)]/10 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-foreground">Light</span>
                    {theme === 'light' && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white" />
                    )}
                  </div>
                  {/* Visual design hint */}
                  <div className="h-6 w-full rounded border border-slate-200 bg-white flex items-center px-1.5 gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <div className="h-1 flex-1 bg-slate-200 rounded-sm" />
                  </div>
                </button>

                {/* Dark Theme Option */}
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`border rounded-xl p-3 text-left transition-all relative flex flex-col justify-between h-24 ${
                    theme === 'dark'
                      ? 'border-[var(--accent)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/5 ring-1 ring-indigo-500'
                      : 'border-border bg-slate-50 dark:bg-[var(--surface-1)]/10 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-foreground">Dark</span>
                    {theme === 'dark' && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white" />
                    )}
                  </div>
                  {/* Visual design hint */}
                  <div className="h-6 w-full rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center px-1.5 gap-1">
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                    <div className="h-1 flex-1 bg-slate-800 rounded-sm" />
                  </div>
                </button>

                {/* System Theme Option */}
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`border rounded-xl p-3 text-left transition-all relative flex flex-col justify-between h-24 ${
                    theme === 'system'
                      ? 'border-[var(--accent)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white/5 ring-1 ring-indigo-500'
                      : 'border-border bg-slate-50 dark:bg-[var(--surface-1)]/10 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-foreground">System</span>
                    {theme === 'system' && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white" />
                    )}
                  </div>
                  {/* Visual design hint */}
                  <div className="h-6 w-full rounded border border-border bg-white dark:bg-[var(--surface-2)] flex items-center overflow-hidden">
                    <div className="w-1/2 h-full bg-white flex items-center px-1 gap-0.5 border-r border-slate-200">
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                      <div className="h-0.5 w-full bg-slate-200" />
                    </div>
                    <div className="w-1/2 h-full bg-[var(--surface-2)] flex items-center px-1 gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-slate-700" />
                      <div className="h-0.5 w-full bg-slate-800" />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span className="text-[10px] text-muted-foreground">
              {isSaving ? 'Saving preferences...' : 'All changes saved.'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white hover:bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-white font-semibold text-xs tracking-wide transition-colors"
            >
              Done
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
