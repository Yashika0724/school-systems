import { supabase } from '@/integrations/supabase/client';

export interface CreateOrderResponse {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  invoice_id: string;
  invoice_number: string;
}

export interface VerifyResponse {
  success: boolean;
  payment_id: string;
  amount: number;
  new_status: string;
  already_recorded?: boolean;
}

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

export async function createOrder(invoice_id: string, amount: number): Promise<CreateOrderResponse> {
  const { data, error } = await supabase.functions.invoke<CreateOrderResponse>(
    'razorpay-create-order',
    { body: { invoice_id, amount } },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empty response from create-order');
  return data;
}

export async function verifyPayment(args: {
  invoice_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyResponse> {
  const { data, error } = await supabase.functions.invoke<VerifyResponse>(
    'razorpay-verify',
    { body: args },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empty response from verify');
  return data;
}

export function openRazorpayCheckout(params: {
  order: CreateOrderResponse;
  prefill?: RazorpayOptions['prefill'];
  description?: string;
}): Promise<RazorpaySuccess> {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded'));
      return;
    }
    const rzp = new window.Razorpay({
      key: params.order.key_id,
      amount: params.order.amount,
      currency: params.order.currency,
      order_id: params.order.order_id,
      name: 'KnctED Fees',
      description: params.description || `Invoice ${params.order.invoice_number}`,
      prefill: params.prefill,
      theme: { color: '#6366f1' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.open();
  });
}
