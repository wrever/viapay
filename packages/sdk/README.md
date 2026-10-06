# `@viapay/sdk`

Cliente JS/TS para crear **links de pago únicos** (`/pay/{id}`) con tu API key secreta.

```ts
import { ViaPay } from "@viapay/sdk";

const via = new ViaPay({
  apiKey: process.env.VIAPAY_API_KEY!, // sk_… — solo servidor
  baseUrl: "https://viapay-api.vercel.app",
});

const link = await via.createPaymentLink({
  amount: "10",
  asset: "XLM",
  externalUserId: "user_42", // tu id de cliente
  successUrl: "https://tu-app.example/gracias",
});
// Redirigí al pagador → link.url
```

También: `createCheckout` (snake_case), `getPaymentLink(id)`, `ViaPay.verifyWebhook`, helpers x402.
