// ==============================================================================
// CLINSYST SUPABASE EDGE FUNCTION: PAYMENT WEBHOOK HANDLER (LEMON SQUEEZY - MoR)
// ==============================================================================
// Deploy command:
// supabase functions deploy payment-webhook --no-verify-jwt
//
// Endpoint URL:
// Lemon Squeezy: https://<project-ref>.supabase.co/functions/v1/payment-webhook?provider=lemon_squeezy
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || 'lemon_squeezy';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();

    // --------------------------------------------------------------------------
    // LEMON SQUEEZY WEBHOOK HANDLER (MERCHANT OF RECORD - NO COMPANY REQUIRED)
    // --------------------------------------------------------------------------
    if (provider === 'lemon_squeezy') {
      const event = JSON.parse(rawBody);
      const eventName = event.meta?.event_name;
      console.log(`[Lemon Squeezy] Event Received: ${eventName}`);

      const data = event.data?.attributes;
      const userEmail = data?.user_email;
      const customData = event.meta?.custom_data || {};
      const planId = customData.plan_id || 'starter';

      if (eventName === 'subscription_created' || eventName === 'subscription_resumed' || eventName === 'order_created') {
        if (userEmail) {
          console.log(`[Lemon Squeezy] Activating tenant for ${userEmail} (Plan: ${planId})`);
          await supabase
            .from('clinic_tenants')
            .update({
              status: 'active',
              subscription_plan: planId,
              updated_at: new Date().toISOString(),
            })
            .eq('billing_email', userEmail);
        }
      } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
        if (userEmail) {
          console.log(`[Lemon Squeezy] Cancelling tenant subscription for ${userEmail}`);
          await supabase
            .from('clinic_tenants')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('billing_email', userEmail);
        }
      }

      return new Response(JSON.stringify({ received: true, provider: 'lemon_squeezy', event: eventName }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported provider. Clinsyst uses lemon_squeezy.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Payment Webhook Error]:', error);
    return new Response(JSON.stringify({ error: error.message || 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
