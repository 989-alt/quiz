import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateClassCode } from '@/lib/classCode'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { teacherId } = body as { teacherId: string }

    if (!teacherId) {
      return NextResponse.json({ error: 'teacherId is required' }, { status: 400 })
    }

    // Generate class code with collision retry
    let classCode = ''
    let attempts = 0
    while (attempts < 5) {
      const candidate = generateClassCode()
      const { data: existing } = await adminClient
        .from('sessions')
        .select('id')
        .eq('class_code', candidate)
        .single()

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
