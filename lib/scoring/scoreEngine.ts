import { adminClient } from '@/lib/supabase/admin'

interface Weights {
  bill_pass_party: number
  pledge_match: number
  district_align: number
  district_conflict: number
  co_propose: number
  recall_success: number
  speech: number
  event_bonus: number
  participation: number
}

type EventRow = {
  session_id: string
  player_id: string | null
  party: string | null
  event_type: number
  delta: number
  reason: string
  weight: number
}

async function getWeights(sessionId: string): Promise<Weights | null> {
  const { data } = await adminClient
    .from('sessions')
    .select('weights')
    .eq('id', sessionId)
    .single()
  return data ? (data.weights as Weights) : null
}

// Award score events triggered by stage4 bill results + stage3 speeches
export async function awardStage4Scores(sessionId: string): Promise<void> {
  const W = await getWeights(sessionId)
  if (!W) return

  const [
    { data: bills },
    { data: players },
    { data: pledgeDefs },
    { data: speeches },
    { data: distEffects },
  ] = await Promise.all([
    adminClient
      .from('bills')
      .select('id, bill_code, area, proposer_id, co_proposer_ids, proposer_party, stage4_result')
      .eq('session_id', sessionId),
    adminClient
      .from('players')
      .select('id, party, district, pledge_code')
      .eq('session_id', sessionId)
      .eq('is_online', true),
    adminClient.from('pledge_definitions').select('code, target_bill_codes'),
    adminClient
      .from('speech_requests')
      .select('player_id')
      .eq('session_id', sessionId)
      .eq('status', 'done'),
    adminClient.from('bill_district_effects').select('bill_code, district, delta'),
  ])

  if (!bills || !players) return

  const pledgeMap = new Map(
    (pledgeDefs ?? []).map((p) => [p.code, p.target_bill_codes as string[]])
  )
  const distMap = new Map<string, Map<string, number>>()
  for (const eff of distEffects ?? []) {
    if (!distMap.has(eff.bill_code)) distMap.set(eff.bill_code, new Map())
    distMap.get(eff.bill_code)!.set(eff.district, eff.delta as number)
  }

  const events: EventRow[] = []

  for (const bill of bills) {
    if (bill.stage4_result !== 'PASS') continue

    // Type 1: bill_pass_party
    for (const p of players) {
      if (p.party === bill.proposer_party) {
        events.push({
          session_id: sessionId, player_id: p.id, party: p.party,
          event_type: 1, delta: W.bill_pass_party, reason: `bill_pass:${bill.bill_code}`, weight: 1.0,
        })
      }
    }

    // Type 5: co_propose
    for (const cpId of (bill.co_proposer_ids as string[]) ?? []) {
      events.push({
        session_id: sessionId, player_id: cpId, party: null,
        event_type: 5, delta: W.co_propose, reason: `co_propose:${bill.bill_code}`, weight: 1.0,
      })
    }

    // Type 2: pledge_match — any player whose pledge targets this bill_code
    for (const p of players) {
      if (!p.pledge_code) continue
      const targets = pledgeMap.get(p.pledge_code) ?? []
      if ((targets as string[]).includes(bill.bill_code)) {
        events.push({
          session_id: sessionId, player_id: p.id, party: p.party,
          event_type: 2, delta: W.pledge_match, reason: `pledge_match:${bill.bill_code}`, weight: 1.0,
        })
      }
    }

    // Types 3 & 4: district effects from bill_district_effects reference table
    const distEffMap = distMap.get(bill.bill_code)
    if (distEffMap) {
      for (const p of players) {
        if (!p.district) continue
        const dDelta = distEffMap.get(p.district as string)
        if (dDelta == null) continue
        if (dDelta > 0) {
          events.push({
            session_id: sessionId, player_id: p.id, party: p.party,
            event_type: 3, delta: W.district_align, reason: `district_align:${bill.bill_code}`, weight: 1.0,
          })
        } else {
          events.push({
            session_id: sessionId, player_id: p.id, party: p.party,
            event_type: 4, delta: W.district_conflict, reason: `district_conflict:${bill.bill_code}`, weight: 1.0,
          })
        }
      }
    }
  }

  // Type 7: speech — each player who completed a speech in stage3
  const speechedIds = new Set((speeches ?? []).map((s) => s.player_id as string))
  for (const playerId of speechedIds) {
    events.push({
      session_id: sessionId, player_id: playerId, party: null,
      event_type: 7, delta: W.speech, reason: 'speech:stage3', weight: 1.0,
    })
  }

  if (events.length > 0) {
    await adminClient.from('score_events').insert(events)
  }
  await adminClient.rpc('recalculate_player_scores', { p_session_id: sessionId })
}

// Award score events triggered by stage5 recall results + participation
export async function awardStage5Scores(sessionId: string): Promise<void> {
  const W = await getWeights(sessionId)
  if (!W) return

  const [{ data: bills }, { data: players }, { data: pledgeDefs }] = await Promise.all([
    adminClient
      .from('bills')
      .select('id, bill_code, proposer_id, co_proposer_ids, proposer_party, stage5_result')
      .eq('session_id', sessionId)
      .eq('recall_used', true),
    adminClient
      .from('players')
      .select('id, party, pledge_code')
      .eq('session_id', sessionId)
      .eq('is_online', true),
    adminClient.from('pledge_definitions').select('code, target_bill_codes'),
  ])

  if (!players) return

  const pledgeMap = new Map(
    (pledgeDefs ?? []).map((p) => [p.code, p.target_bill_codes as string[]])
  )

  const events: EventRow[] = []

  for (const bill of bills ?? []) {
    if (bill.stage5_result !== 'PASS') continue

    // Type 1: bill_pass_party (recall pass)
    for (const p of players) {
      if (p.party === bill.proposer_party) {
        events.push({
          session_id: sessionId, player_id: p.id, party: p.party,
          event_type: 1, delta: W.bill_pass_party, reason: `bill_pass_recall:${bill.bill_code}`, weight: 1.0,
        })
      }
    }

    // Type 5: co_propose
    for (const cpId of (bill.co_proposer_ids as string[]) ?? []) {
      events.push({
        session_id: sessionId, player_id: cpId, party: null,
        event_type: 5, delta: W.co_propose, reason: `co_propose_recall:${bill.bill_code}`, weight: 1.0,
      })
    }

    // Type 6: recall_success — proposer gets special bonus
    if (bill.proposer_id) {
      events.push({
        session_id: sessionId, player_id: bill.proposer_id as string, party: null,
        event_type: 6, delta: W.recall_success, reason: `recall_success:${bill.bill_code}`, weight: 1.0,
      })
    }

    // Type 2: pledge_match (recall)
    for (const p of players) {
      if (!p.pledge_code) continue
      const targets = pledgeMap.get(p.pledge_code) ?? []
      if ((targets as string[]).includes(bill.bill_code)) {
        events.push({
          session_id: sessionId, player_id: p.id, party: p.party,
          event_type: 2, delta: W.pledge_match, reason: `pledge_match_recall:${bill.bill_code}`, weight: 1.0,
        })
      }
    }
  }

  // Type 10: participation — all active players
  for (const p of players) {
    events.push({
      session_id: sessionId, player_id: p.id, party: p.party,
      event_type: 10, delta: W.participation, reason: 'participation', weight: 1.0,
    })
  }

  if (events.length > 0) {
    await adminClient.from('score_events').insert(events)
  }
  await adminClient.rpc('recalculate_player_scores', { p_session_id: sessionId })
}

// Fetch updated scores and broadcast SCORE_UPDATE per player
export async function broadcastScores(sessionId: string, classCode: string): Promise<void> {
  const { data: players } = await adminClient
    .from('players')
    .select('id, score, rank')
    .eq('session_id', sessionId)

  if (!players?.length) return

  await Promise.all(
    players.map((p) =>
      adminClient.channel(`session:${classCode}`).send({
        type: 'broadcast',
        event: 'SCORE_UPDATE',
        payload: { playerId: p.id, score: p.score, rank: p.rank },
      })
    )
  )
}
