// eventScheduler.ts
// Utility for generating and evaluating event slots for auto event system
import { EVENT_CARDS } from '@/lib/gameConfig'
import type { EventCardType } from '@/lib/gameConfig'

export interface EventSlot {
  id: string
  stage: 2 | 3 | 4
  offsetRatio: number // 0.25~0.75: fraction of stage duration at which to trigger
  eventType: EventCardType
  triggered: boolean
  skipped: boolean
}

export interface EventSettings {
  auto_enabled: boolean
  slots: EventSlot[]
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Called at session start — generates 2 or 3 random event slots across stage2~4
export function generateEventSlots(count: 2 | 3 = 3): EventSlot[] {
  const allStages: Array<2 | 3 | 4> = [2, 3, 4]
  const selected: Array<2 | 3 | 4> =
    count === 3 ? allStages : shuffleArray(allStages).slice(0, 2)

  const eventTypes = EVENT_CARDS.map((c) => c.type as EventCardType)

  return selected.map((stage) => ({
    id: crypto.randomUUID(),
    stage,
    offsetRatio: 0.25 + Math.random() * 0.5,
    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    triggered: false,
    skipped: false,
  }))
}

// Compute absolute trigger time for a slot given stage start + duration
export function computeTriggerTime(
  slot: EventSlot,
  stageStartedAt: string,
  stageDurationMs: number
): Date {
  const start = new Date(stageStartedAt).getTime()
  return new Date(start + stageDurationMs * slot.offsetRatio)
}
