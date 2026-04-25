import { ALL_DISTRICTS, ALL_PLEDGE_CODES, PLEDGE_DIFFICULTIES, specialtyFromPledge } from '@/lib/gameConfig'
import type { PledgeDifficulty } from '@/lib/types'

export interface RoleAssignment {
  index: number
  party: string
  district: string
  pledgeCode: string
  pledgeDifficulty: PledgeDifficulty
  specialty: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function distributeRoles(count: number): RoleAssignment[] {
  const poolSize = Math.min(ALL_DISTRICTS.length, ALL_PLEDGE_CODES.length)
  if (count <= 0 || count > poolSize) {
    throw new Error(`distributeRoles: count ${count} must be 1–${poolSize}`)
  }

  // \uc5ec 40% / \uc57c 40% / \ubb34 20% — Math.floor \uc0ac\uc6a9\uc73c\ub85c indCount \uc74c\uc218 \ubc29\uc9c0 \ubcf4\uc7a5
  const govCount = Math.floor(count * 0.4)
  const oppCount = Math.floor(count * 0.4)
  const indCount = count - govCount - oppCount

  const parties: string[] = [
    ...Array(govCount).fill('\uc5ec'),
    ...Array(oppCount).fill('\uc57c'),
    ...Array(indCount).fill('\ubb34'),
  ]
  const shuffledParties = shuffle(parties)
  const shuffledDistricts = shuffle([...ALL_DISTRICTS].slice(0, count))
  const shuffledPledges = shuffle([...ALL_PLEDGE_CODES].slice(0, count))

  return Array.from({ length: count }, (_, i) => {
    const pledgeCode = shuffledPledges[i]
    return {
      index: i,
      party: shuffledParties[i],
      district: shuffledDistricts[i],
      pledgeCode,
      pledgeDifficulty: PLEDGE_DIFFICULTIES[i % PLEDGE_DIFFICULTIES.length],
      specialty: specialtyFromPledge(pledgeCode),
    }
  })
}
