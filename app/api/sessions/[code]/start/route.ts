import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { DISTRICTS, PLAYER_PLEDGE_CODES, PLEDGE_DIFFICULTIES, specialtyFromPledge } from '@/lib/gameConfig'

interface RouteParams {
  params: { code: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { teacherId } = body as { teacherId: string }

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    }

    // Verify teacher
    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('id, teacher_id, status')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Count approved players (ordered by join time for deterministic role assignment)
    const { data: approvedPlayers, error: playersError } = await adminClient
      .from('players')
      .select('id')
      .eq('session_id', session.id)
      .eq('is_online', true)
      .order('joined_at', { ascending: true })

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 })
    }

    const playerCount = approvedPlayers?.length ?? 0

    if (playerCount < 2) {
      return NextResponse.json({ error: 'Need at least 2 approved players' }, { status: 409 })
    }

    if (playerCount > 10) {
      return NextResponse.json({ error: 'Max 10 players allowed' }, { status: 409 })
    }

    // Assign roles (deterministic — players ordered by joined_at ASC)
    const roleUpdates = approvedPlayers!.map((p, i) => {
      const idx = i + 1
      let party: string
      if (idx <= 4) party = '\uc5ec'
      else if (idx <= 8) party = '\uc57c'
      else party = '\ubb34'

      const pledgeCode = PLAYER_PLEDGE_CODES[i % PLAYER_PLEDGE_CODES.length]

      return {
        id: p.id,
        party,
        district: DISTRICTS[i % DISTRICTS.length],
        pledge_code: pledgeCode,
        pledge_difficulty: PLEDGE_DIFFICULTIES[i % 3],
        specialty: specialtyFromPledge(pledgeCode),
      }
    })

    // Batch update players (parallel, fail-fast before session state change)
    const updateResults = await Promise.all(
      roleUpdates.map((update) =>
        adminClient
          .from('players')
          .update({
            party: update.party,
            district: update.district,
            pledge_code: update.pledge_code,
            pledge_difficulty: update.pledge_difficulty,
            specialty: update.specialty,
          })
          .eq('id', update.id)
      )
    )

    const failedUpdate = updateResults.find((r) => r.error)
    if (failedUpdate?.error) {
      console.error('Player role update error:', failedUpdate.error)
      return NextResponse.json({ error: 'Failed to assign roles' }, { status: 500 })
    }

    // Copy bill templates into this session's bills
    const { data: templates, error: templatesError } = await adminClient
      .from('bill_templates')
      .select('*')
      .order('display_order', { ascending: true })

    if (templatesError || !templates?.length) {
      console.error('bill_templates fetch error:', templatesError)
      return NextResponse.json({ error: 'Bill templates not found' }, { status: 500 })
    }

    const { error: billsError } = await adminClient.from('bills').insert(
      templates.map((t) => ({
        session_id: session.id,
        bill_code: t.bill_code,
        area: t.area,
        title: t.title,
        body: t.body,
        important: t.important,
        proposer_party: t.proposer_party,
        co_proposer_ids: [],
        display_order: t.display_order,
      }))
    )

    if (billsError) {
      console.error('Bills seed error:', billsError)
      return NextResponse.json({ error: 'Failed to seed bills' }, { status: 500 })
    }

    const now = new Date()
    const stageEndsAt = new Date(now.getTime() + 5 * 60 * 1000)

    // Update session to stage1
    const { data: updatedSession, error: updateError } = await adminClient
      .from('sessions')
      .update({
        status: 'stage1',
        current_stage: 1,
        started_at: now.toISOString(),
        stage_ends_at: stageEndsAt.toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Broadcast GAME_START
    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'GAME_START',
      payload: { session: updatedSession, playerCount },
    })

    return NextResponse.json({ session: updatedSession, playerCount })
  } catch (err) {
    console.error('POST /api/sessions/[code]/start error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
