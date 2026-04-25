import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { billId, choice, stage, deviceToken } = body as {
      billId: string
      choice: string
      stage: number
      deviceToken: string
    }

    if (!billId || !choice || !stage || !deviceToken) {
      return NextResponse.json({ error: 'billId, choice, stage, deviceToken required' }, { status: 400 })
    }

    if (!(['\ucc2c', '\ubc18', '\uae30\uad8c'] as string[]).includes(choice)) {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 })
    }

    if (![4, 5].includes(stage)) {
      return NextResponse.json({ error: 'Vote stage must be 4 or 5' }, { status: 400 })
    }

    // Verify player
    const { data: player, error: playerError } = await adminClient
      .from('players')
      .select('id, session_id, is_online')
      .eq('device_token', deviceToken)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    if (!player.is_online) {
      return NextResponse.json({ error: 'Player not approved' }, { status: 403 })
    }

    // Verify session + stage
    const { data: session } = await adminClient
      .from('sessions')
      .select('id, status, current_stage')
      .eq('class_code', code)
      .eq('id', player.session_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.current_stage !== stage) {
      return NextResponse.json({ error: 'Not current voting stage' }, { status: 409 })
    }

    // Upsert vote (allow changing vote during stage)
    const { data: vote, error: voteError } = await adminClient
      .from('votes')
      .upsert(
        {
          bill_id: billId,
          player_id: player.id,
          session_id: session.id,
          choice,
          stage,
        },
        { onConflict: 'bill_id,player_id,stage' }
      )
      .select('id')
      .single()

    if (voteError) {
      console.error('Vote upsert error:', voteError)
      return NextResponse.json({ error: voteError.message }, { status: 500 })
    }

    return NextResponse.json({ voteId: vote.id, choice })
  } catch (err) {
    console.error('POST /api/sessions/[code]/vote error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
