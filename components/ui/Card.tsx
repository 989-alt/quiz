import { cn } from './cn'
import type { HTMLAttributes } from 'react'
import type { Party } from '@/types'

type CardParty = Party | 'neutral'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  party?: CardParty
  elevated?: boolean
}

const partyBorderStyles: Record<CardParty, string> = {
  '\uc5ec': 'border-party-ruling',
  '\uc57c': 'border-party-opposition',
  '\ubb34': 'border-party-independent',
  neutral: 'border-gray-200',
}

export function Card({
  party = 'neutral',
  elevated = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-card border p-4',
        partyBorderStyles[party],
        elevated && 'shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
