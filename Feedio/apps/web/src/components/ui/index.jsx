import { useState, useEffect } from 'react'
import { Icons } from './Icons'

// ─── BUTTON ─────────────────────────────────────────────────────────────────
/**
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
 * size:    'sm' | 'md' | 'lg'
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  fullWidth = false,
}) {
  const base = `inline-flex items-center justify-center gap-2 font-medium rounded-xl
    transition-all duration-200 select-none outline-none focus-visible:ring-2
    focus-visible:ring-offset-2 active:scale-[0.97]
    ${fullWidth ? 'w-full' : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`

  const sizes = {
    sm: 'text-[12px] px-3 py-1.5 gap-1.5',
    md: 'text-[13px] px-4 py-2.5',
    lg: 'text-[14px] px-6 py-3',
  }

  const variants = {
    primary:   'bg-[#1a2e28] text-white hover:bg-[#243d35] shadow-sm hover:shadow-md focus-visible:ring-[#1a2e28]',
    secondary: 'bg-[#CCFBF1] text-[#134E4A] hover:bg-[#99F6E4] focus-visible:ring-teal-300',
    ghost:     'bg-transparent text-[#374151] hover:bg-[#F3F4F6] focus-visible:ring-gray-300',
    outline:   'bg-white border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:ring-gray-300',
    danger:    'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA] focus-visible:ring-red-300',
    pro:       'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-sm hover:shadow-md focus-visible:ring-violet-400',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  )
}

// ─── BADGE ──────────────────────────────────────────────────────────────────
export function Badge({ children, style = {}, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${className}`}
      style={style}
    >
      {children}
    </span>
  )
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
export function Avatar({ initials = '?', color = '#E0F2FE', size = 'md' }) {
  const sizes = { sm: 'w-6 h-6 text-[9px]', md: 'w-8 h-8 text-[11px]', lg: 'w-10 h-10 text-[13px]' }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-[#1a2e28] border border-white/60 shadow-sm`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

// ─── INPUT ──────────────────────────────────────────────────────────────────
export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightElement,
  className = '',
  inputClassName = '',
  required,
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-[12px] font-semibold text-[#374151]">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-[#9CA3AF] flex items-center">{leftIcon}</span>
        )}
        <input
          className={`w-full bg-white border ${error ? 'border-rose-400' : 'border-[#E5E7EB]'}
            rounded-xl py-2.5 text-[13px] text-[#111827] placeholder:text-[#9CA3AF]
            focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent
            transition-all duration-150
            ${leftIcon ? 'pl-9' : 'pl-3'} ${rightElement ? 'pr-10' : 'pr-3'}
            ${inputClassName}`}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-3 flex items-center">{rightElement}</span>
        )}
      </div>
      {hint && !error && <p className="text-[11px] text-[#6B7280]">{hint}</p>}
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  )
}

// ─── TEXTAREA ────────────────────────────────────────────────────────────────
export function Textarea({ label, hint, error, className = '', required, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-[12px] font-semibold text-[#374151]">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        className={`w-full bg-white border ${error ? 'border-rose-400' : 'border-[#E5E7EB]'}
          rounded-xl px-3 py-2.5 text-[13px] text-[#111827] placeholder:text-[#9CA3AF]
          focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent
          transition-all duration-150 resize-none`}
        {...props}
      />
      {hint && !error && <p className="text-[11px] text-[#6B7280]">{hint}</p>}
      {error && <p className="text-[11px] text-rose-500">{error}</p>}
    </div>
  )
}

// ─── SELECT ──────────────────────────────────────────────────────────────────
export function Select({ label, hint, options = [], className = '', required, ...props }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-[12px] font-semibold text-[#374151]">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-[13px] text-[#111827]
          focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent
          transition-all duration-150 cursor-pointer"
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="text-[11px] text-[#6B7280]">{hint}</p>}
    </div>
  )
}

// ─── TOGGLE ──────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, hint, disabled = false }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex-shrink-0 w-10 h-6 rounded-full transition-colors duration-200
          ${checked ? 'bg-teal-500' : 'bg-[#D1D5DB]'}
          ${!disabled && 'cursor-pointer'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </div>
      {(label || hint) && (
        <div>
          {label && <p className="text-[13px] font-medium text-[#111827]">{label}</p>}
          {hint  && <p className="text-[11px] text-[#6B7280] mt-0.5">{hint}</p>}
        </div>
      )}
    </label>
  )
}

// ─── MODAL ──────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-md' }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F3F4F6]">
            <h2 className="text-[16px] font-semibold text-[#111827]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
            >
              <Icons.X size={16} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6B7280] hover:bg-[#F3F4F6] transition-colors z-10"
          >
            <Icons.X size={16} />
          </button>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
export function EmptyState({ illustration, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {illustration && (
        <div className="mb-4 flex items-center justify-center">{illustration}</div>
      )}
      <h3 className="text-[16px] font-semibold text-[#111827] mb-2">{title}</h3>
      {body && <p className="text-[13px] text-[#6B7280] max-w-xs mb-6">{body}</p>}
      {action}
    </div>
  )
}

// ─── COPY BUTTON ─────────────────────────────────────────────────────────────

export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg
        transition-all duration-200 ${copied
          ? 'bg-teal-100 text-teal-700'
          : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
        } ${className}`}
    >
      {copied ? <Icons.Check size={11} /> : <Icons.Copy size={11} />}
      {copied ? 'Copied!' : 'Copy link'}
    </button>
  )
}
