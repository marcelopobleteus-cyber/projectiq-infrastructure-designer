'use client'

import React from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-red-50 border-red-200 text-[var(--danger)]',
          confirmBtn: 'bg-[var(--danger)] hover:bg-red-700 text-white',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          )
        }
      case 'warning':
        return {
          iconBg: 'bg-[var(--warn-soft)] border-amber-200 text-[var(--warn)]',
          confirmBtn: 'bg-[var(--warn)] hover:bg-amber-600 text-white',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          )
        }
      case 'info':
      default:
        return {
          iconBg: 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent-text)]',
          confirmBtn: 'bg-[var(--accent)] text-white',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          )
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-extrabold text-[var(--text-primary)] leading-snug">
              {title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold rounded-lg transition cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer shadow-xs ${styles.confirmBtn}`}
          >
            {isLoading && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
