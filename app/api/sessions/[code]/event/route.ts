import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import type { EventSettings, EventSlot } from '@/lib/eventScheduler'
import { EVENT_CARDS } from '@/lib/gameConfig'
import type { EventCardType } from '@/lib/gameConfig'

interface RouteParams {
  params: { code: string }
}

// Apply score side-effects for event cards that modify scores
async function applyEventScore(
  sessionId: string,
  eventType: EventCardType,
  target: PostBody['target']
): Promise<void> {
  const card = EVENT_CARDS.find((c) => c.type === eventType)
  if (!card || card.scoreImpact === 0) return

  const { scoreImpact } = card

  // press_scoop: penalise a specific player
  if (eventType === 'press_scoop' && target?.playerId) {
    await adminClient.from('score_events').insert({
      session_id: sessionId,
      player_id: target.playerId,
      party: null,
      event_type: 8,
      delta: scoreImpact,
      reason: 'event:press_scoop',
      weight: 1.0,
    })
    await adminClient.rpc('recalculate_player_scores', { p_session_id: sessionId })
    return
  }

  // poll_reveal: bonus to all players in the leading party
  if (eventType === 'poll_reveal' && target?.party) {
    const { data: partyPlayers } = await adminClient
      .from('players')
      .select('id')
      .eq('session_id', sessionId)
      .eq('party', target.party)
      .eq('is_online', true)

    if (partyPlayers?.length) {
      await adminClient.from('score_events').insert(
        partyPlayers.map((p) => ({
          session_id: sessionId,
          player_id: p.id,
          party: target.party,
          event_type: 8,
          delta: scoreImpact,
          reason: 'event:poll_reveal',
          weight: 1.0,
        }))
      )
      await adminClient.rpc('recalculate_player_scores', { p_session_id: sessionId })
    }
    return
  }

  // mass_protest: penalise players who voted in favour of a specific bill
  if (eventType === 'mass_protest' && target?.billCode) {
    const { data: bills } = await adminClient
      .from('bills')
      .select('id')
      .eq('session_id', sessionId)
      .eq('bill_code', target.billCode)

    if (bills?.length) {
      const billIds = bills.map((b) => b.id)
      const { data: favourVotes } = await adminClient
        .from('votes')
        .select('player_id')
        .eq('session_id', sessionId)
        .in('bill_id', billIds)
        .eq('choice', '\ucc2c')

      if (favourVotes?.length) {
        const uniquePlayerIds = [...new Set(favourVotes.map((v) => v.player_id))]
        await adminClient.from('score_events').insert(
          uniquePlayerIds.map((pid) => ({
            session_id: sessionId,
            player_id: pid,
            party: null,
            event_type: 8,
            delta: scoreImpact,
            reason: `event:mass_protest:${target.billCode}`,
            weight: 1.0,
          }))
        )
        await adminClient.rpc('recalculate_player_scores', { p_session_id: sessionId })
      }
    }
    return
  }

  // disaster: bonus to players in the affected district
  if (eventType === 'disaster' && target?.district) {
    const { data: districtPlayers } = await adminClient
      .from('players')
      .select('id, party')
      .eq('session_id', sessionId)
      .eq('district', target.district)
      .eq('is_online', true)

    if (districtPlayers?.length) {
      await adminClient.from('score_events').insert(
        districtPlayers.map((p) => ({
          session_id: sessionId,
          player_id: p.id,
          party: p.party,
          event_type: 8,
          delta: scoreImpact,
          reason: `event:disaster:${target.district}`,
          weight: 1.0,
        }))
      )
      await adminClient.rpc('recalculate_player_scores', { p_session_id: sessionId })
    }
    return
  }
}

interface PostBody {
  teacherId: string
  slotId?: string
  eventType: EventCardType
  target?: {
    playerId?: string
    billCode?: string
    district?: string
    party?: string
  }
}

interface PatchBody {
  teacherId: string
  action: 'skip' | 'toggle_auto'
  slotId?: string
}

// POST — trigger an event (auto slot or forced)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = (await req.json()) as PostBody
    const { teacherId, slotId, eventType, target } = body

    if (!teacherId || !eventType) {
      return NextResponse.json({ error: 'teacherId and eventType are required' }, { status: 400 })
    }

    // Fetch session
    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('id, teacher_id, event_settings')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const eventSettings = (session.event_settings ?? {
      auto_enabled: true,
      slots: [],
    }) as EventSettings

    // If slotId provided, validate slot state
    if (slotId) {
      const slotIndex = eventSettings.slots.findIndex((s: EventSlot) => s.id === slotId)
      if (slotIndex === -1) {
        return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
      }
      const slot = eventSettings.slots[slotIndex]
      if (slot.triggered || slot.skipped) {
        return NextResponse.json(
          { error: 'Slot already triggered or skipped' },
          { status: 409 }
        )
      }

      // Mark slot triggered — optimistic concurrency: only update if slot is still pending
      const updatedSlots = eventSettings.slots.map((s: EventSlot) =>
        s.id === slotId ? { ...s, triggered: true } : s
      )
      const { data: concurrentCheck, error: updateError } = await adminClient
        .from('sessions')
        .update({
          event_settings: { ...eventSettings, slots: updatedSlots },
        })
        .eq('id', session.id)
        .select('id')
        .single()

      if (updateError || !concurrentCheck) {
        return NextResponse.json({ error: 'Slot already processed (concurrent update)' }, { status: 409 })
      }

      // Notify all clients that slot state changed
      await adminClient.channel(`session:${code}`).send({
        type: 'broadcast',
        event: 'EVENT_SETTINGS_UPDATED',
        payload: { event_settings: { ...eventSettings, slots: updatedSlots } },
      })
    }

    // Insert event_log (unique index on slotId prevents duplicate triggers at DB level)
    await adminClient.from('event_logs').insert({
      session_id: session.id,
      event_type: eventType,
      payload: { target: target ?? null, slotId: slotId ?? null },
      triggered_by: null,
      triggered_at: new Date().toISOString(),
    })

    // Apply score side-effects (non-fatal)
    applyEventScore(session.id, eventType, target).catch((err) =>
      console.error('applyEventScore error:', err)
    )

    // Broadcast EVENT_CARD to all players
    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'EVENT_CARD',
      payload: { eventType, target: target ?? null, slotId: slotId ?? null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/sessions/[code]/event error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — skip a slot or toggle auto_enabled
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = (await req.json()) as PatchBody
    const { teacherId, action, slotId } = body

    if (!teacherId || !action) {
      return NextResponse.json({ error: 'teacherId and action are required' }, { status: 400 })
    }

    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('id, teacher_id, event_settings')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const eventSettings = (session.event_settings ?? {
      auto_enabled: true,
      slots: [],
    }) as EventSettings

    let updatedSettings: EventSettings

    if (action === 'skip') {
      if (!slotId) {
        return NextResponse.json({ error: 'slotId required for skip' }, { status: 400 })
      }
      const slotIndex = eventSettings.slots.findIndex((s: EventSlot) => s.id === slotId)
      if (slotIndex === -1) {
        return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
      }
      updatedSettings = {
        ...eventSettings,
        slots: eventSettings.slots.map((s: EventSlot) =>
          s.id === slotId ? { ...s, skipped: true } : s
        ),
      }
    } else if (action === 'toggle_auto') {
      updatedSettings = {
        ...eventSettings,
        auto_enabled: !eventSettings.auto_enabled,
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error: updateError } = await adminClient
      .from('sessions')
      .update({ event_settings: updatedSettings })
      .eq('id', session.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'EVENT_SETTINGS_UPDATED',
      payload: { event_settings: updatedSettings },
    })

    return NextResponse.json({ ok: true, event_settings: updatedSettings })
  } catch (err) {
    console.error('PATCH /api/sessions/[code]/event error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
