# Payment adapters

Lebse supports Chapa and Telebirr through `server/payment-adapters.mjs`.

The adapters are intentionally inactive until the provider credentials are configured:

```text
LEBSE_PAYMENT_PROVIDER=chapa
LEBSE_CHAPA_CHECKOUT_URL=...
LEBSE_CHAPA_API_KEY=...
LEBSE_CHAPA_WEBHOOK_SECRET=...
```

or:

```text
LEBSE_PAYMENT_PROVIDER=telebirr
LEBSE_TELEBIRR_CHECKOUT_URL=...
LEBSE_TELEBIRR_API_KEY=...
LEBSE_TELEBIRR_WEBHOOK_SECRET=...
```

Provider URLs and credential names are configuration values because live merchant contracts can differ. Never put these values in Vercel, the mobile app, or source control.
