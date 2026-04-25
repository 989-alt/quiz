import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateClassCode } from '@/lib/classCode'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { teacherId, playerCount } = body as { teacherId: string; playerCount?: number }

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    }

    const rawCount = typeof playerCount === 'number' && Number.isFinite(playerCount)
      ? Math.floor(playerCount)
      : 10
    const validCount = Math.min(30, Math.max(10, rawCount))

    // Generate class code with collision retry
    let classCode = ''
    let attempts = 0
    while (attempts < 5) {
      const candidate = generateClassCode()
      const { data: existing, error: lookupErr } = await adminClient
        .from('sessions')
        .select('id')
        .eq('class_code', candidate)
        .maybeSingle()

      if (lookupErr) {
        console.error('class_code lookup error:', lookupErr)
        attempts++
        continue
      }
      if (!existing) {
        classCode = candidate
        break
      }
      attempts++
    }

    if (!classCode) {
      return NextResponse.json({ error: 'Failed to generate unique class code' }, { status: 500 })
    }

    const { data: session, error } = await adminClient
      .from('sessions')
      .insert({
        class_code: classCode,
        teacher_id: teacherId,
        status: 'waiting',
        current_stage: 0,
        player_count: validCount,
        settings: {},
      })
      .select()
      .single()

    if (error) {
      console.error('Session insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session, teacherId }, { status: 201 })
  } catch (err) {
    console.error('POST /api/sessions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
