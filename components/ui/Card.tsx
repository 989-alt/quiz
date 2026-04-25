import { cn } from './cn'
import type { HTMLAttributes } from 'react'

type CardParty = '\uc5ec\ub2f9' | '\uc57c\ub2f9' | '\ubb34\uc18c\uc18d' | 'neutral'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  party?: CardParty
  elevated?: boolean
}

const partyBorderStyles: Record<CardParty, string> = {
  '\uc5ec\ub2f9': 'border-party-ruling',
  '\uc57c\ub2f9': 'border-party-opposition',
  '\ubb34\uc18c\uc18d': 'border-party-independent',
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
        'bg-white rounded-card border-2 p-4',
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
