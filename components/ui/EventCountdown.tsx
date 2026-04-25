'use client'
import { EVENT_CARDS } from '@/lib/gameConfig'
import type { EventCardType } from '@/lib/gameConfig'

interface Props {
  eventType: EventCardType
  secondsLeft: number
  onFire: () => void
  onSkip: () => void
}

export function EventCountdown({ eventType, secondsLeft, onFire, onSkip }: Props) {
  const card = EVENT_CARDS.find((c) => c.type === eventType)

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-deep border border-yellow-400/50 rounded-xl p-4 shadow-lg min-w-72 text-center">
      <p className="text-yellow-400 text-sm font-semibold mb-1">
        {'\uc774\ubca4\ud2b8 \ubc1c\ub3d9 \uc608\uc815'}
      </p>
      <p className="text-white text-lg font-bold mb-2">{card?.label}</p>
      <p className="text-neutral text-sm mb-3">{card?.description}</p>
      <div className="flex gap-2 justify-center">
        <button
          onClick={onFire}
          className="px-4 py-2 bg-mint text-navy text-sm font-semibold rounded-lg hover:bg-mint/90 transition-colors"
        >
          {'\uc9c0\uae08 \ubc1c\ub3d9 ('}
          {secondsLeft}
          {')'}
        </button>
        <button
          onClick={onSkip}
          className="px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20 transition-colors"
        >
          {'\uac74\ub108\ub9f0\uae30'}
        </button>
      </div>
    </div>
  )
}
