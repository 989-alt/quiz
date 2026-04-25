import { cn } from './cn'
import type { HTMLAttributes } from 'react'

type BadgeVariant = 'party-ruling' | 'party-opposition' | 'party-independent' | 'area' | 'importance' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  'party-ruling': 'bg-party-ruling/15 text-party-ruling border-party-ruling/30',
  'party-opposition': 'bg-party-opposition/15 text-party-opposition border-party-opposition/30',
  'party-independent': 'bg-party-independent/15 text-party-independent border-party-independent/30',
  area: 'bg-mint/20 text-navy border-mint/40',
  importance: 'bg-coral/15 text-coral border-coral/30',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
