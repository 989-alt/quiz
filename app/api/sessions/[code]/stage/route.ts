import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: { code: string }
}

const STAGE_DURATIONS: Record<number, number> = {
  1: 5,
  2: 10,
  3: 10,
  4: 8,
  5: 7,
}

function stageToStatus(stage: number): string {
  if (stage >= 1 && stage <= 5) return `stage${stage}`
  if (stage > 5) return 'ended'
  return 'stage1'
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const code = params.code.toUpperCase()
    const body = await req.json()
    const { teacherId, action, adjustMinutes } = body as {
      teacherId: string
      action: 'next' | 'prev' | 'adjust'
      adjustMinutes?: -1 | 1
    }

    if (!teacherId || !action) {
      return NextResponse.json({ error: 'teacherId and action are required' }, { status: 400 })
    }

    // Verify teacher
    const { data: session, error: sessionError } = await adminClient
      .from('sessions')
      .select('id, teacher_id, status, current_stage, stage_ends_at')
      .eq('class_code', code)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (session.status === 'ended' && action !== 'adjust') {
      return NextResponse.json({ error: 'Session already ended' }, { status: 409 })
    }

    let newStage = session.current_stage
    let newEndsAt: Date

    if (action === 'next') {
      newStage = session.current_stage + 1
      const durationMinutes = STAGE_DURATIONS[newStage] ?? 5
      newEndsAt = new Date(Date.now() + durationMinutes * 60 * 1000)
    } else if (action === 'prev') {
      newStage = Math.max(1, session.current_stage - 1)
      const durationMinutes = STAGE_DURATIONS[newStage] ?? 5
      newEndsAt = new Date(Date.now() + durationMinutes * 60 * 1000)
    } else if (action === 'adjust') {
      newStage = session.current_stage
      const currentEnds = session.stage_ends_at
        ? new Date(session.stage_ends_at)
        : new Date()
      newEndsAt = new Date(currentEnds.getTime() + (adjustMinutes ?? 1) * 60 * 1000)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const newStatus = stageToStatus(newStage)

    const { data: updatedSession, error: updateError } = await adminClient
      .from('sessions')
      .update({
        current_stage: newStage,
        status: newStatus,
        stage_ends_at: newEndsAt!.toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'STAGE_CHANGE',
      payload: { session: updatedSession, stage: newStage, status: newStatus },
    })

    return NextResponse.json({ session: updatedSession })
  } catch (err) {
    console.error('POST /api/sessions/[code]/stage error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
