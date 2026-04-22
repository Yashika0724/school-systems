import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface VerifyBody {
  invoice_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
      return new Response(JSON.stringify({ error: 'Razorpay keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const body = (await req.json()) as VerifyBody;
    if (
      !body.invoice_id ||
      !body.razorpay_order_id ||
      !body.razorpay_payment_id ||
      !body.razorpay_signature
    ) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    const expected = await hmacSha256Hex(
      keySecret,
      `${body.razorpay_order_id}|${body.razorpay_payment_id}`,
    );
    if (expected !== body.razorpay_signature) {
      console.error('Signature mismatch', { expected, got: body.razorpay_signature });
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fetch authoritative amount from Razorpay — never trust client
    const rzpAuth = btoa(`${keyId}:${keySecret}`);
    const pmtRes = await fetch(
      `https://api.razorpay.com/v1/payments/${body.razorpay_payment_id}`,
      { headers: { Authorization: `Basic ${rzpAuth}` } },
    );
    if (!pmtRes.ok) {
      const t = await pmtRes.text();
      console.error('Razorpay fetch error', t);
      return new Response(JSON.stringify({ error: 'Could not verify payment with Razorpay' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payment = await pmtRes.json();
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return new Response(
        JSON.stringify({ error: `Payment not successful: ${payment.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (payment.order_id !== body.razorpay_order_id) {
      return new Response(JSON.stringify({ error: 'Order/payment mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const amountRupees = Number(payment.amount) / 100;

    // Idempotency: if this payment_id already recorded, short-circuit
    const { data: existing } = await admin
      .from('fee_payments')
      .select('id')
      .eq('razorpay_payment_id', body.razorpay_payment_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, already_recorded: true, payment_id: existing.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Authorization: user must own invoice
    const { data: invoice, error: invErr } = await admin
      .from('fee_invoices')
      .select('id, total_amount, paid_amount, status, student_id')
      .eq('id', body.invoice_id)
      .maybeSingle();
    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: student } = await admin
      .from('students')
      .select('user_id')
      .eq('id', invoice.student_id)
      .maybeSingle();
    let authorized = student?.user_id === user.id;
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

    // Insert payment
    const { data: pmtRow, error: pmtErr } = await admin
      .from('fee_payments')
      .insert({
        invoice_id: invoice.id,
        amount: amountRupees,
        payment_method: payment.method || 'online',
        transaction_id: body.razorpay_payment_id,
        razorpay_order_id: body.razorpay_order_id,
        razorpay_payment_id: body.razorpay_payment_id,
        razorpay_signature: body.razorpay_signature,
        gateway_status: payment.status,
        received_by: user.id,
      })
      .select('id')
      .single();

    if (pmtErr) {
      console.error('Payment insert error:', pmtErr);
      throw pmtErr;
    }

    // Update invoice
    const newPaid = Number(invoice.paid_amount) + amountRupees;
    const newStatus =
      newPaid >= Number(invoice.total_amount) ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

    const { error: updErr } = await admin
      .from('fee_invoices')
      .update({ paid_amount: newPaid, status: newStatus })
      .eq('id', invoice.id);

    if (updErr) {
      console.error('Invoice update error:', updErr);
      throw updErr;
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: pmtRow.id,
        amount: amountRupees,
        new_status: newStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('verify error:', error);
    const msg = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
