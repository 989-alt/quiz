import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

const DISTRICTS = [
  '\uc11c\uc6b8\uac11',
  '\uc11c\uc6b8\uc744',
  '\ubd80\uc0b0\uac11',
  '\ubd80\uc0b0\uc744',
  '\uc778\ucc9c\uac11',
  '\uc778\ucc9c\uc744',
  '\ub300\uad6c\uac11',
  '\ub300\uad6c\uc744',
  '\uad11\uc8fc\uac11',
  '\uad11\uc8fc\uc744',
]

const PLEDGE_CODES = [
  'EDU-01', 'EDU-02', 'EDU-03',
  'ECO-01', 'ECO-02', 'ECO-03',
  'ENV-01', 'ENV-02',
  'SOC-01', 'SOC-02',
]

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

    // Assign roles
    const roleUpdates = approvedPlayers!.map((p, i) => {
      const idx = i + 1
      let party: string
      if (idx <= 4) party = '\uc5ec'
      else if (idx <= 8) party = '\uc57c'
      else party = '\ubb34'

      return {
        id: p.id,
        party,
        district: DISTRICTS[i % DISTRICTS.length],
        pledge_code: PLEDGE_CODES[i % PLEDGE_CODES.length],
        pledge_difficulty: (['easy', 'medium', 'hard'] as const)[i % 3],
        specialty: '\uc77c\ubc18',
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
