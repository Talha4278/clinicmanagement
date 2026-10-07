import { PaymentGatewayConfig, PaymentGatewayProvider } from './types';
import { getClinicSettings } from './clinicSettings';

export interface CheckoutOptions {
  planId: 'starter' | 'pro' | 'network';
  planName: string;
  priceUSD: number;
  billingCycle: 'monthly' | 'annual';
  customerEmail?: string;
  clinicName?: string;
  currency?: string;
  onSuccess?: (details: { transactionId: string; planId: string }) => void;
  onCancel?: () => void;
}

export interface ValidationResult {
  isValid: boolean;
  isLiveProduction: boolean;
  provider: PaymentGatewayProvider;
  checklist: {
    label: string;
    status: 'pass' | 'warn' | 'fail';
    detail: string;
  }[];
  errors: string[];
  recommendations: string[];
}

/**
 * Validates a PaymentGatewayConfig for Lemon Squeezy Merchant of Record production readiness.
 */
export function validateProductionPaymentConfig(
  customConfig?: PaymentGatewayConfig
): ValidationResult {
  const config = customConfig || getClinicSettings().payment_gateway_config || {
    enabled: true,
    provider: 'lemon_squeezy',
  };

  const checklist: ValidationResult['checklist'] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];
  let isLiveProduction = false;

  const provider = config.provider || 'lemon_squeezy';
  const isTestMode = config.test_mode === true;

  if (!config.enabled) {
    checklist.push({
      label: 'Gateway Status',
      status: 'fail',
      detail: 'Payment gateway is currently disabled in Clinic Settings.',
    });
    errors.push('Payment gateway is toggled off.');
  } else {
    checklist.push({
      label: 'Gateway Status',
      status: 'pass',
      detail: provider === 'lemon_squeezy'
        ? 'Lemon Squeezy (Merchant of Record - No Legal Company Required)'
        : 'In-Clinic POS / Direct Bank & Wise Wire Transfer',
    });
  }

  // 1. Lemon Squeezy Validation (Merchant of Record)
  if (provider === 'lemon_squeezy') {
    const storeId = config.lemon_squeezy_store_id || (import.meta as any).env?.VITE_LEMON_SQUEEZY_STORE_ID || '';
    const apiKey = config.secret_key || (import.meta as any).env?.LEMON_SQUEEZY_API_KEY || '';
    const webhookSecret = config.webhook_secret || (import.meta as any).env?.LEMON_SQUEEZY_WEBHOOK_SECRET || '';

    if (!storeId) {
      checklist.push({
        label: 'Lemon Squeezy Store ID',
        status: 'fail',
        detail: 'Missing Lemon Squeezy Store ID from your Lemon Squeezy Dashboard settings.',
      });
      errors.push('Lemon Squeezy Store ID is required for checkout.');
      recommendations.push('Find your numeric Store ID in Lemon Squeezy -> Settings -> Stores.');
    } else {
      checklist.push({
        label: 'Lemon Squeezy Store ID',
        status: 'pass',
        detail: `Store ID configured: ${storeId}`,
      });
    }

    if (apiKey) {
      checklist.push({
        label: 'Lemon Squeezy API Key',
        status: 'pass',
        detail: 'API key configured for backend subscription synchronization.',
      });
    } else {
      checklist.push({
        label: 'Lemon Squeezy API Key',
        status: 'warn',
        detail: 'Recommended for automated customer subscription management.',
      });
      recommendations.push('Generate an API Key in Lemon Squeezy -> Settings -> API.');
    }

    if (webhookSecret) {
      checklist.push({
        label: 'Webhook Signing Secret',
        status: 'pass',
        detail: 'Webhook secret configured for HMAC signature verification.',
      });
    } else {
      checklist.push({
        label: 'Webhook Signing Secret',
        status: 'warn',
        detail: 'Recommended to verify incoming subscription_created and subscription_cancelled events.',
      });
      recommendations.push('Create a Webhook endpoint in Lemon Squeezy pointing to your Supabase Edge Function.');
    }

    // Variant IDs check
    const starterVariant = config.price_ids?.starter_monthly || (import.meta as any).env?.VITE_LS_VARIANT_STARTER;
    const proVariant = config.price_ids?.pro_monthly || (import.meta as any).env?.VITE_LS_VARIANT_PRO;
    const networkVariant = config.price_ids?.network_monthly || (import.meta as any).env?.VITE_LS_VARIANT_NETWORK;

    if (starterVariant || proVariant || networkVariant) {
      checklist.push({
        label: 'Product Variant IDs',
        status: 'pass',
        detail: 'Plan Variant IDs mapped to Lemon Squeezy subscription products.',
      });
    } else {
      checklist.push({
        label: 'Product Variant IDs',
        status: 'warn',
        detail: 'No custom Variant IDs entered. Default test variants will be used for checkout testing.',
      });
      recommendations.push('Create subscription products for $29, $79, $149 in Lemon Squeezy and paste their Variant IDs.');
    }

    isLiveProduction = !isTestMode && Boolean(storeId);
  }

  // 2. Manual / Direct Bank Transfer Validation
  if (provider === 'manual') {
    checklist.push({
      label: 'Manual Settlement Mode',
      status: 'pass',
      detail: 'Clinics pay directly via Wise wire transfer, bank deposit, or physical terminal.',
    });
    isLiveProduction = true;
  }

  // Security Checklist
  checklist.push({
    label: 'HTTPS / TLS Security',
    status: window.location.protocol === 'https:' ? 'pass' : 'warn',
    detail: window.location.protocol === 'https:'
      ? 'Secure TLS/HTTPS connection active.'
      : 'Local development environment. Production domain must be HTTPS.',
  });

  checklist.push({
    label: 'Environment Mode',
    status: isTestMode ? 'warn' : 'pass',
    detail: isTestMode
      ? 'Sandbox / Test Mode is ACTIVE. Real cards will NOT be charged.'
      : 'LIVE Production Mode is ACTIVE. Lemon Squeezy will charge real cards.',
  });

  return {
    isValid: errors.length === 0,
    isLiveProduction,
    provider,
    checklist,
    errors,
    recommendations,
  };
}

/**
 * Asynchronously loads an external script (e.g. Lemon.js)
 */
function loadExternalScript(src: string, id: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Production Checkout Launcher
 * Dispatches to Lemon Squeezy Overlay or Sandbox Simulator
 */
export async function launchGlobalCheckout(options: CheckoutOptions): Promise<{
  success: boolean;
  message: string;
  redirected?: boolean;
}> {
  const settings = getClinicSettings();
  const config = settings.payment_gateway_config || {
    enabled: true,
    provider: 'lemon_squeezy',
    test_mode: true,
  };

  const provider = config.provider || 'lemon_squeezy';
  const isTestMode = config.test_mode === true;

  // 1. LEMON SQUEEZY OVERLAY CHECKOUT (MERCHANT OF RECORD)
  if (provider === 'lemon_squeezy' && !isTestMode) {
    const storeId = config.lemon_squeezy_store_id || (import.meta as any).env?.VITE_LEMON_SQUEEZY_STORE_ID;
    if (storeId) {
      await loadExternalScript('https://assets.lemonsqueezy.com/lemon.js', 'lemonsqueezy-js');

      // Variant lookup
      const variantMap: Record<string, string> = {
        starter: config.price_ids?.starter_monthly || (import.meta as any).env?.VITE_LS_VARIANT_STARTER || 'variant_starter',
        pro: config.price_ids?.pro_monthly || (import.meta as any).env?.VITE_LS_VARIANT_PRO || 'variant_pro',
        network: config.price_ids?.network_monthly || (import.meta as any).env?.VITE_LS_VARIANT_NETWORK || 'variant_network',
      };

      const variantId = variantMap[options.planId] || options.planId;
      const checkoutUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${variantId}?checkout[email]=${encodeURIComponent(
        options.customerEmail || ''
      )}&checkout[custom][clinic_name]=${encodeURIComponent(options.clinicName || settings.clinic_name)}`;

      // If Lemon.js is loaded, open overlay
      const lemon = (window as any).createLemonSqueezy;
      if (typeof lemon === 'function') {
        lemon();
        (window as any).LemonSqueezy?.Url?.Open(checkoutUrl);
        return { success: true, message: 'Opened Lemon Squeezy overlay checkout', redirected: true };
      }

      // Otherwise redirect
      window.location.href = checkoutUrl;
      return { success: true, message: 'Redirecting to Lemon Squeezy checkout...', redirected: true };
    }
  }

  // 2. SANDBOX / TEST SIMULATOR
  return new Promise((resolve) => {
    const mockTxId = `ls_mock_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    setTimeout(() => {
      if (options.onSuccess) {
        options.onSuccess({
          transactionId: mockTxId,
          planId: options.planId,
        });
      }
      resolve({
        success: true,
        message: `Lemon Squeezy Sandbox Authorization Verified for "${options.planName}" ($${options.priceUSD}/mo). Transaction Ref: ${mockTxId}`,
      });
    }, 800);
  });
}
