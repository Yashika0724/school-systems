import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function randomPassword(length = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz!@#$%^&*'
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

function isError(err: unknown): err is { message: string } {
  return typeof err === 'object' && err !== null && 'message' in err
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin caller
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: callerRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single()
    if (callerRole?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      applicationId,
      classId,
      rollNumber,
      admissionNumber,
      createParent = true,
      studentEmail,
      studentPassword,
      parentPassword,
    } = await req.json()

    if (!applicationId || !classId) {
      return new Response(
        JSON.stringify({ error: 'applicationId and classId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Load application
    const { data: app, error: appErr } = await supabaseAdmin
      .from('admission_applications')
      .select('*')
      .eq('id', applicationId)
      .single()
    if (appErr || !app) throw appErr ?? new Error('Application not found')
    if (app.status === 'enrolled') {
      return new Response(JSON.stringify({ error: 'Already enrolled' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const studentFullName = `${app.student_first_name} ${app.student_last_name}`.trim()
    const resolvedStudentEmail: string =
      studentEmail ||
      `${app.student_first_name}.${app.student_last_name}.${app.application_number}`
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '') + '@student.local'
    const resolvedStudentPassword = studentPassword || randomPassword()

    // Create student auth user
    const { data: studentAuth, error: studentAuthErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: resolvedStudentEmail,
        password: resolvedStudentPassword,
        email_confirm: true,
        user_metadata: { full_name: studentFullName },
      })
    if (studentAuthErr) throw studentAuthErr
    const studentUserId = studentAuth.user.id

    // Profile
    const { error: studentProfileErr } = await supabaseAdmin.from('profiles').insert({
      user_id: studentUserId,
      email: resolvedStudentEmail,
      full_name: studentFullName,
      phone: null,
    })
    if (studentProfileErr) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      throw studentProfileErr
    }

    // Role
    const { error: studentRoleErr } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: studentUserId, role: 'student' })
    if (studentRoleErr) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      throw studentRoleErr
    }

    // Student row — note: students table does not have date_of_birth/gender columns,
    // those live on the application record for reference.
    const { data: studentRow, error: studentErr } = await supabaseAdmin
      .from('students')
      .insert({
        user_id: studentUserId,
        class_id: classId,
        roll_number: rollNumber || null,
        admission_number: admissionNumber || app.application_number,
        blood_group: app.student_blood_group,
      })
      .select('id')
      .single()
    if (studentErr || !studentRow) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId)
      throw studentErr ?? new Error('Failed to create student')
    }
    const studentId = studentRow.id

    // Optional parent account
    let parentUserId: string | null = null
    let parentInfo: { email: string; password: string } | null = null
    if (createParent && app.parent_email) {
      // Re-use existing parent user if one already has this email
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('email', app.parent_email)
        .maybeSingle()

      if (existingProfile?.user_id) {
        parentUserId = existingProfile.user_id
      } else {
        const resolvedParentPassword = parentPassword || randomPassword()
        const { data: parentAuth, error: parentAuthErr } =
          await supabaseAdmin.auth.admin.createUser({
            email: app.parent_email,
            password: resolvedParentPassword,
            email_confirm: true,
            user_metadata: { full_name: app.parent_name },
          })
        if (parentAuthErr) {
          console.error('Parent auth create failed:', parentAuthErr)
        } else if (parentAuth.user) {
          parentUserId = parentAuth.user.id
          await supabaseAdmin.from('profiles').insert({
            user_id: parentUserId,
            email: app.parent_email,
            full_name: app.parent_name,
            phone: app.parent_phone,
          })
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: parentUserId, role: 'parent' })
          parentInfo = { email: app.parent_email, password: resolvedParentPassword }
        }
      }

      if (parentUserId) {
        // Ensure parents row exists
        let parentRecordId: string | null = null
        const { data: existingParent } = await supabaseAdmin
          .from('parents')
          .select('id')
          .eq('user_id', parentUserId)
          .maybeSingle()
        if (existingParent?.id) {
          parentRecordId = existingParent.id
        } else {
          const { data: newParent } = await supabaseAdmin
            .from('parents')
            .insert({
              user_id: parentUserId,
              occupation: app.parent_occupation,
              relationship: app.parent_relationship,
            })
            .select('id')
            .single()
          parentRecordId = newParent?.id ?? null
        }
        if (parentRecordId) {
          await supabaseAdmin.from('parent_student').insert({
            parent_id: parentRecordId,
            student_id: studentId,
            relationship: app.parent_relationship || 'parent',
          })
        }
      }
    }

    // Mark application as enrolled
    const { error: updateErr } = await supabaseAdmin
      .from('admission_applications')
      .update({
        status: 'enrolled',
        converted_student_id: studentId,
        reviewed_by: caller.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
    if (updateErr) throw updateErr

    return new Response(
      JSON.stringify({
        success: true,
        studentId,
        studentUserId,
        studentCredentials: {
          email: resolvedStudentEmail,
          password: resolvedStudentPassword,
        },
        parentCredentials: parentInfo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: unknown) {
    console.error('enroll-applicant error:', err)
    const message = isError(err) ? err.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
