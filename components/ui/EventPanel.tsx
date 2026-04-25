'use client'
import { useState } from 'react'
import { EVENT_CARDS } from '@/lib/gameConfig'
import type { EventCardType } from '@/lib/gameConfig'
import type { EventSettings, EventSlot } from '@/lib/eventScheduler'

interface EventPanelProps {
  eventSettings: EventSettings | null
  currentStage: number
  onToggleAuto: () => void
  onSkipSlot: (slotId: string) => void
  onForceEvent: (eventType: EventCardType) => void
  loading: boolean
}

const STAGE_LABEL: Record<number, string> = {
  2: '\ub2e8\uacc4 2',
  3: '\ub2e8\uacc4 3',
  4: '\ub2e8\uacc4 4',
}

function slotStatusLabel(slot: EventSlot): string {
  if (slot.triggered) return '\ubc1c\ub3d9\ub428'
  if (slot.skipped) return '\uac74\ub108\ub9f4'
  return '\ub300\uae30'
}

function slotStatusColor(slot: EventSlot): string {
  if (slot.triggered) return 'text-mint'
  if (slot.skipped) return 'text-neutral line-through'
  return 'text-yellow-400'
}

export function EventPanel({
  eventSettings,
  currentStage,
  onToggleAuto,
  onSkipSlot,
  onForceEvent,
  loading,
}: EventPanelProps) {
  const [selectedType, setSelectedType] = useState<EventCardType>(
    EVENT_CARDS[0].type as EventCardType
  )

  if (!eventSettings) return null

  const { auto_enabled, slots } = eventSettings

  return (
    <div className="bg-slate-deep rounded-card border border-white/10 p-4 space-y-4">
      {/* Header + auto toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">
          {'\uc774\ubca4\ud2b8 \ucee8\ud2b8\ub864'}
        </h3>
        <button
          onClick={onToggleAuto}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
            auto_enabled
              ? 'bg-mint/20 text-mint border border-mint/40'
              : 'bg-white/10 text-neutral border border-white/20'
          }`}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              auto_enabled ? 'bg-mint' : 'bg-neutral'
            }`}
          />
          {auto_enabled ? '\uc790\ub3d9 ON' : '\uc790\ub3d9 OFF'}
        </button>
      </div>

      {/* Slot list */}
      <div className="space-y-2">
        <p className="text-neutral text-xs">{'\uc608\uc57d \uc2ac\ub86f'}</p>
        {slots.length === 0 ? (
          <p className="text-neutral text-sm">{'\uc608\uc57d\ub41c \uc774\ubca4\ud2b8\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.'}</p>
        ) : (
          <ul className="space-y-1.5">
            {slots.map((slot) => {
              const card = EVENT_CARDS.find((c) => c.type === slot.eventType)
              const isActive = slot.stage === currentStage
              return (
                <li
                  key={slot.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                    isActive ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-navy'
                  }`}
                >
                  <span className="text-xs text-neutral w-10 shrink-0">
                    {STAGE_LABEL[slot.stage] ?? `S${slot.stage}`}
                  </span>
                  <span className="text-white text-xs flex-1 truncate">
                    {card?.label ?? slot.eventType}
                  </span>
                  <span className={`text-xs font-semibold shrink-0 ${slotStatusColor(slot)}`}>
                    {slotStatusLabel(slot)}
                  </span>
                  {!slot.triggered && !slot.skipped && (
                    <button
                      onClick={() => onSkipSlot(slot.id)}
                      disabled={loading}
                      className="shrink-0 px-2 py-0.5 bg-white/10 text-neutral text-xs rounded hover:bg-white/20 disabled:opacity-40 transition-colors"
                    >
                      {'\uac74\ub108\ub9f0\uae30'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Force trigger */}
      <div className="border-t border-white/10 pt-3 space-y-2">
        <p className="text-neutral text-xs">{'\uc989\uc2dc \ubc1c\ub3d9'}</p>
        <div className="flex gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as EventCardType)}
            className="flex-1 bg-navy border border-white/20 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-mint"
          >
            {EVENT_CARDS.map((c) => (
              <option key={c.type} value={c.type}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => onForceEvent(selectedType)}
            disabled={loading}
            className="px-3 py-1.5 bg-party-ruling text-white text-xs font-bold rounded-lg hover:bg-party-ruling/90 disabled:opacity-50 transition-colors shrink-0"
          >
            {'\ubc1c\ub3d9'}
          </button>
        </div>
      </div>
    </div>
  )
}
