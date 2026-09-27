import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { X } from 'lucide-react'
import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Buttons / inputs — the tool chrome is a dark, dense editor UI.
// ---------------------------------------------------------------------------

type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'subtle'

export function Button({
  variant = 'default',
  size = 'md',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none select-none'
  const sizes = size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8.5 px-3.5 text-[13px]'
  const variants: Record<ButtonVariant, string> = {
    default: 'bg-[#23252d] text-zinc-200 hover:bg-[#2c2f39] border border-[#31343f]',
    primary: 'bg-indigo-500 text-white hover:bg-indigo-400',
    ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-[#23252d]',
    danger: 'bg-red-500/90 text-white hover:bg-red-500',
    subtle: 'bg-[#1c1e25] text-zinc-300 hover:bg-[#23252d] border border-[#2a2d36]',
  }
  return <button className={clsx(base, sizes, variants[variant], className)} {...rest} />
}

export function IconButton({
  className,
  active,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={clsx(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-[#2c2f39] hover:text-zinc-100 disabled:opacity-30 disabled:pointer-events-none',
        active && 'bg-[#2c2f39] text-indigo-300',
        className,
      )}
      {...rest}
    />
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        'h-8 rounded-md border border-[#2f323c] bg-[#171920] px-2.5 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-500/70',
        className,
      )}
      {...rest}
    />
  )
})

export function NumberInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      className={clsx(
        'h-8 w-24 rounded-md border border-[#2f323c] bg-[#171920] px-2 text-[13px] text-zinc-200 outline-none focus:border-indigo-500/70',
        className,
      )}
      {...rest}
    />
  )
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-md border border-[#2f323c] bg-[#171920] px-2.5 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-500/70',
        className,
      )}
      {...rest}
    />
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'h-8 rounded-md border border-[#2f323c] bg-[#171920] px-2 text-[13px] text-zinc-200 outline-none focus:border-indigo-500/70',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
  className,
}: {
  label?: ReactNode
  checked: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <label className={clsx('inline-flex cursor-pointer items-center gap-2 text-[13px] text-zinc-300 select-none', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-[#3a3d48] bg-[#171920] accent-indigo-500"
      />
      {label}
    </label>
  )
}

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------

export interface SegmentedOption<T extends string | number> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = 'md',
  className,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <div className={clsx('inline-flex rounded-md border border-[#2f323c] bg-[#14161c] p-0.5', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={clsx(
            'inline-flex items-center gap-1 rounded-[5px] font-medium transition-colors',
            size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-xs',
            value === opt.value ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-zinc-100',
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        {hint ? <span className="text-[11px] text-zinc-600">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

export function SectionCard({ title, hint, right, children, className }: { title?: ReactNode; hint?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('rounded-lg border border-[#23252e] bg-[#12141a]', className)}>
      {(title || right) && (
        <header className="flex items-center justify-between border-b border-[#23252e] px-4 py-2.5">
          <div className="flex items-baseline gap-2">
            <h3 className="text-[13px] font-semibold text-zinc-200">{title}</h3>
            {hint ? <span className="text-[11px] text-zinc-600">{hint}</span> : null}
          </div>
          {right}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#171920] px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium text-zinc-200">{value}</div>
    </div>
  )
}

export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {icon ? <div className="text-zinc-600">{icon}</div> : null}
      <div className="text-sm font-medium text-zinc-300">{title}</div>
      {hint ? <div className="max-w-md text-xs leading-relaxed text-zinc-500">{hint}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warn' | 'danger' | 'success' | 'accent' }) {
  const tones = {
    default: 'bg-[#23252d] text-zinc-400',
    warn: 'bg-amber-500/15 text-amber-400',
    danger: 'bg-red-500/15 text-red-400',
    success: 'bg-emerald-500/15 text-emerald-400',
    accent: 'bg-indigo-500/15 text-indigo-300',
  }
  return <span className={clsx('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</span>
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  open: boolean
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-full flex-col rounded-xl border border-[#2a2d37] bg-[#16181f] shadow-2xl" style={{ width }}>
        <header className="flex items-center justify-between border-b border-[#23252e] px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <IconButton onClick={onClose} aria-label="关闭">
            <X size={15} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-[#23252e] px-4 py-3">{footer}</footer> : null}
      </div>
    </div>
  )
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmText = '删除',
  danger = true,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      width={400}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-[13px] leading-relaxed text-zinc-400">{message}</div>
    </Modal>
  )
}
