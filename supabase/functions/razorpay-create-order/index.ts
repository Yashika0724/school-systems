import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CreateOrderBody {
  invoice_id: string;
  amount: number; // rupees (user-specified partial amount allowed)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      return new Response(
        JSON.stringify({ error: 'Razorpay keys not configured on server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as CreateOrderBody;
    if (!body.invoice_id || !body.amount || body.amount <= 0) {
      return new Response(JSON.stringify({ error: 'invoice_id and amount > 0 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller owns invoice (student self, or parent linked to student)
    const { data: invoice, error: invErr } = await admin
      .from('fee_invoices')
      .select('id, total_amount, paid_amount, status, student_id, invoice_number, students:student_id(user_id)')
      .eq('id', body.invoice_id)
      .maybeSingle();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const studentUserId = (invoice as { students?: { user_id?: string } }).students?.user_id;
    let authorized = studentUserId === user.id;
    if (!authorized) {
      const { data: link } = await admin
        .from('parent_student')
        .select('parents!inner(user_id)')
        .eq('student_id', invoice.student_id)
        .eq('parents.user_id', user.id)
        .maybeSingle();
      authorized = !!link;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Not authorized for this invoice' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);
    if (balance <= 0 || invoice.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Invoice already paid' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (body.amount > balance) {
      return new Response(
        JSON.stringify({ error: `Amount exceeds outstanding balance of ${balance}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create Razorpay order (amount in paise)
    const amountPaise = Math.round(body.amount * 100);
    const receipt = `inv_${invoice.id.slice(0, 28)}`;
    const rzpAuth = btoa(`${keyId}:${keySecret}`);

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${rzpAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          user_id: user.id,
        },
      }),
    });

    if (!rzpRes.ok) {
      const errText = await rzpRes.text();
      console.error('Razorpay order error:', errText);
      return new Response(JSON.stringify({ error: 'Failed to create Razorpay order' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await rzpRes.json();

    return new Response(
      JSON.stringify({
        key_id: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('create-order error:', error);
    const msg = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
