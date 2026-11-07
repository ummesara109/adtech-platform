import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary:
    'bg-auto text-navy shadow-sm hover:bg-auto-dark hover:shadow-md active:scale-[0.98]',
  secondary:
    'border border-navy/12 bg-white text-navy shadow-sm hover:border-navy/25 hover:bg-paper active:scale-[0.98]',
  ghost: 'text-teal hover:bg-teal/10 active:scale-[0.98]',
  outline:
    'border border-teal/40 bg-teal/5 text-teal hover:bg-teal hover:text-white active:scale-[0.98]',
  dark: 'bg-white/12 text-white ring-1 ring-white/20 hover:bg-white/20 active:scale-[0.98]',
  white: 'bg-white text-navy shadow-md hover:bg-paper active:scale-[0.98]',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98]',
} as const

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-sm',
} as const

type Variant = keyof typeof variants
type Size = keyof typeof sizes

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button type="button" className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

type ButtonLinkProps = {
  to: string
  variant?: Variant
  size?: Size
  className?: string
  children: ReactNode
}

export function ButtonLink({ to, variant = 'primary', size = 'md', className = '', children }: ButtonLinkProps) {
  return (
    <Link to={to} className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  )
}
