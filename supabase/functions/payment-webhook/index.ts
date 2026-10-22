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
      const planId = (customData.plan_id || 'pro') as string;
      const clinicId = customData.clinic_id;

      const planSpecs: Record<string, { max_seats: number; max_sessions: number; canonicalPlan: string }> = {
        starter: { max_seats: 2, max_sessions: 2, canonicalPlan: 'starter' },
        pro: { max_seats: 5, max_sessions: 5, canonicalPlan: 'pro' },
        enterprise: { max_seats: 25, max_sessions: 25, canonicalPlan: 'enterprise' },
        network: { max_seats: 25, max_sessions: 25, canonicalPlan: 'enterprise' },
      };

      const resolved = planSpecs[planId] || planSpecs.pro;

      if (eventName === 'subscription_created' || eventName === 'subscription_resumed' || eventName === 'order_created') {
        const updatePayload = {
          status: 'active',
          plan: resolved.canonicalPlan,
          max_seats: resolved.max_seats,
          max_concurrent_sessions: resolved.max_sessions,
        };

        if (clinicId) {
          console.log(`[Lemon Squeezy] Activating clinic by ID: ${clinicId} (Plan: ${resolved.canonicalPlan})`);
          await supabase.from('clinics').update(updatePayload).eq('id', clinicId);
        } else if (userEmail) {
          console.log(`[Lemon Squeezy] Activating clinic by email: ${userEmail} (Plan: ${resolved.canonicalPlan})`);
          await supabase.from('clinics').update(updatePayload).eq('owner_email', userEmail);
        }
      } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
        if (clinicId) {
          console.log(`[Lemon Squeezy] Suspending clinic subscription for ${clinicId}`);
          await supabase.from('clinics').update({ status: 'suspended' }).eq('id', clinicId);
        } else if (userEmail) {
          console.log(`[Lemon Squeezy] Suspending clinic subscription for ${userEmail}`);
          await supabase.from('clinics').update({ status: 'suspended' }).eq('owner_email', userEmail);
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
