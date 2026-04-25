import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { awardStage4Scores, awardStage5Scores, broadcastScores } from '@/lib/scoring/scoreEngine'

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

async function judgeAllBills(sessionId: string, stage: 4 | 5): Promise<void> {
  const { data: bills } = await adminClient
    .from('bills')
    .select('id, recall_used')
    .eq('session_id', sessionId)

  if (!bills?.length) return

  const billsToJudge = stage === 5 ? bills.filter((b) => b.recall_used) : bills

  await Promise.all(
    billsToJudge.map(async (bill) => {
      const { data } = await adminClient.rpc('judge_bill', {
        p_bill_id: bill.id,
        p_stage: stage,
      })
      if (!data) return
      const result = (data as { result: string }).result
      const updateCol = stage === 4
        ? { stage4_result: result }
        : { stage5_result: result }
      await adminClient.from('bills').update(updateCol).eq('id', bill.id)
    })
  )
}

async function finalizeBills(sessionId: string): Promise<void> {
  const { data: bills } = await adminClient
    .from('bills')
    .select('id, stage4_result, stage5_result')
    .eq('session_id', sessionId)

  if (!bills?.length) return

  await Promise.all(
    bills.map(async (bill) => {
      const finalResult = bill.stage5_result ?? bill.stage4_result
      if (finalResult) {
        await adminClient
          .from('bills')
          .update({ final_result: finalResult })
          .eq('id', bill.id)
      }
    })
  )
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
      const currentEnds = session.stage_ends_at ? new Date(session.stage_ends_at) : new Date()
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
        ...(newStatus === 'ended' ? { ended_at: new Date().toISOString() } : {}),
      })
      .eq('id', session.id)
      .eq('current_stage', session.current_stage)
      .select()
      .single()

    if (updateError || !updatedSession) {
      if (!updatedSession) {
        return NextResponse.json({ error: 'Concurrent update conflict' }, { status: 409 })
      }
      return NextResponse.json({ error: updateError!.message }, { status: 500 })
    }

    await adminClient.channel(`session:${code}`).send({
      type: 'broadcast',
      event: 'STAGE_CHANGE',
      payload: { session: updatedSession, stage: newStage, status: newStatus },
    })

    // Bill judgment + scoring (non-fatal — runs after broadcast so UI updates first)
    const broadcastBillsUpdated = () =>
      adminClient.channel(`session:${code}`).send({
        type: 'broadcast',
        event: 'BILLS_UPDATED',
        payload: {},
      })

    if (action === 'next') {
      if (session.current_stage === 4) {
        judgeAllBills(session.id, 4)
          .then(broadcastBillsUpdated)
          .then(() => awardStage4Scores(session.id))
          .then(() => broadcastScores(session.id, code))
          .catch((err) => console.error('Stage4 scoring error:', err))
      } else if (session.current_stage === 5) {
        judgeAllBills(session.id, 5)
          .then(() => finalizeBills(session.id))
          .then(broadcastBillsUpdated)
          .then(() => awardStage5Scores(session.id))
          .then(() => broadcastScores(session.id, code))
          .catch((err) => console.error('Stage5 scoring error:', err))
      }
    }

    return NextResponse.json({ session: updatedSession })
  } catch (err) {
    console.error('POST /api/sessions/[code]/stage error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
