'use client'

import { cn } from './cn'

interface TimerProps {
  seconds: number
  className?: string
}

export function Timer({ seconds, className }: TimerProps) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isAlert = seconds <= 10
  const isDanger = seconds <= 5

  return (
    <div
      className={cn(
        'font-mono font-bold tabular-nums transition-colors',
        isDanger && 'text-fail animate-pulse-slow',
        !isDanger && isAlert && 'text-alert',
        !isAlert && 'text-navy',
        className,
      )}
      role="timer"
      aria-label={`\ub0a8\uc740 \uc2dc\uac04 ${minutes}\ubd84 ${secs}\ucd08`}
    >
      {display}
    </div>
  )
}
