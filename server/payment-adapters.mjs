import { createHmac, timingSafeEqual } from 'node:crypto';

const PROVIDERS = new Set(['chapa', 'telebirr']);
const required = (value, name) => {
  if (!value) throw new Error(`${name} is required to activate live payments.`);
  return value;
};

const signature = (secret, body) => createHmac('sha256', secret).update(body).digest('hex');
const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
};

export function createPaymentAdapter(provider = process.env.LEBSE_PAYMENT_PROVIDER, env = process.env) {
  if (!PROVIDERS.has(provider)) throw new Error(`Unsupported payment provider: ${provider || 'unset'}.`);
  const prefix = provider.toUpperCase();
  const endpoint = env[`LEBSE_${prefix}_CHECKOUT_URL`];
  const webhookSecret = env[`LEBSE_${prefix}_WEBHOOK_SECRET`];
  const apiKey = env[`LEBSE_${prefix}_API_KEY`];
  return {
    provider,
    activated: Boolean(endpoint && webhookSecret && apiKey),
    async createCheckout({ orderId, amountMinor, currency = 'ETB', returnUrl, callbackUrl, customer }) {
      required(endpoint, `LEBSE_${prefix}_CHECKOUT_URL`);
      required(apiKey, `LEBSE_${prefix}_API_KEY`);
      if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new Error('Payment amount must be a positive integer in minor units.');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ reference: orderId, amount: amountMinor / 100, currency, return_url: returnUrl, callback_url: callbackUrl, customer }),
      });
      if (!response.ok) throw new Error(`${provider} checkout request failed (${response.status}).`);
      return response.json();
    },
    verifyWebhook(rawBody, receivedSignature) {
      required(webhookSecret, `LEBSE_${prefix}_WEBHOOK_SECRET`);
      return safeEqual(signature(webhookSecret, rawBody), receivedSignature);
    },
    mapStatus(value) {
      const normalized = String(value || '').toLowerCase();
      if (['success', 'successful', 'completed', 'paid'].includes(normalized)) return 'succeeded';
      if (['failed', 'failure', 'cancelled', 'canceled'].includes(normalized)) return 'failed';
      return 'pending';
    },
  };
}

export const supportedPaymentProviders = [...PROVIDERS];
