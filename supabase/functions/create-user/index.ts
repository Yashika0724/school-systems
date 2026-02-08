import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the caller is an admin using their JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create client with user's token to verify their identity
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !callerUser) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is admin
    const { data: callerRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single()

    if (roleError || callerRole?.role !== 'admin') {
      console.error('Role check failed:', roleError)
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const {
      email,
      password,
      fullName,
      phone,
      userType,
      // Student fields
      classId,
      rollNumber,
      admissionNumber,
      // Teacher fields
      employeeId,
      designation,
      qualification,
      // Parent fields
      occupation,
      relationship,
      studentId
    } = await req.json()

    // Validate required fields
    if (!email || !password || !fullName || !userType) {
      return new Response(
        JSON.stringify({ error: 'Email, password, full name, and user type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['student', 'teacher', 'parent'].includes(userType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating ${userType} user: ${email}`)

    // 1. Create auth user using admin API (doesn't affect current session)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      console.error('Create user error:', createError)
      throw createError
    }

    const userId = authData.user.id
    console.log(`Created auth user with ID: ${userId}`)

    // 2. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        email,
        full_name: fullName,
        phone: phone || null,
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Cleanup: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw profileError
    }

    // 3. Assign role
    const { error: assignRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: userType,
      })

    if (assignRoleError) {
      console.error('Role assignment error:', assignRoleError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw assignRoleError
    }

    // 4. Create role-specific record
    let specificError = null

    if (userType === 'student') {
      const { error } = await supabaseAdmin
        .from('students')
        .insert({
          user_id: userId,
          class_id: classId || null,
          roll_number: rollNumber || null,
          admission_number: admissionNumber || null,
        })
      specificError = error
    } else if (userType === 'teacher') {
      const { error } = await supabaseAdmin
        .from('teachers')
        .insert({
          user_id: userId,
          employee_id: employeeId || null,
          designation: designation || null,
          qualification: qualification || null,
        })
      specificError = error
    } else if (userType === 'parent') {
      const { error } = await supabaseAdmin
        .from('parents')
        .insert({
          user_id: userId,
          occupation: occupation || null,
          relationship: relationship || null,
        })
      specificError = error

      // Link student if provided
      if (!specificError && studentId) {
        const { data: parentData } = await supabaseAdmin
          .from('parents')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (parentData) {
          const { error: linkError } = await supabaseAdmin
            .from('parent_student')
            .insert({
              parent_id: parentData.id,
              student_id: studentId,
              relationship: relationship || 'parent'
            })
          if (linkError) {
            console.error('Student linking error:', linkError)
            // We don't fail the whole creation if just linking fails, 
            // but we log it. Or we could throw. 
            // User might want to know.
          }
        }
      }
    }

    if (specificError) {
      console.error('Role-specific record error:', specificError)
      // Cleanup
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw specificError
    }

    console.log(`Successfully created ${userType}: ${email}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} created successfully`,
        userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Create user error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
