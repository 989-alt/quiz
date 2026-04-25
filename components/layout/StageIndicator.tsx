import { cn } from '@/components/ui/cn'
import type { StageNumber } from '@/types'

const STAGE_LABELS: Record<StageNumber, string> = {
  1: '\ubc95\uc548 \ubc1c\uc758',
  2: '\uc704\uc6d0\ud68c \uc2ec\uc0ac',
  3: '\ubcf8\ud68c\uc9c0 \ud1a0\ub860',
  4: '\ud45c\uacb0',
  5: '\uacb0\uacfc \ubc1c\ud45c',
}

interface StageIndicatorProps {
  currentStage: StageNumber
  className?: string
}

export function StageIndicator({ currentStage, className }: StageIndicatorProps) {
  const stages = ([1, 2, 3, 4, 5] as StageNumber[])

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {stages.map((stage, index) => {
        const isCompleted = stage < currentStage
        const isCurrent = stage === currentStage
        const isPending = stage > currentStage

        return (
          <div key={stage} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  isCompleted && 'bg-pass text-white',
                  isCurrent && 'bg-navy text-white ring-2 ring-navy ring-offset-2',
                  isPending && 'bg-gray-200 text-gray-400',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {stage}
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  isCurrent && 'text-navy font-semibold',
                  !isCurrent && 'text-neutral',
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {index < stages.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1 mb-4 transition-colors',
                  isCompleted ? 'bg-pass' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
