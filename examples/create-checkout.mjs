/**
 * Example: create a ViaPay hosted checkout link from a Node backend.
 *
 *   pnpm --filter @viapay/sdk exec tsx examples/create-checkout.mjs
 *   (or copy into your app and set VIAPAY_API_KEY)
 */
import { ViaPay } from "@viapay/sdk";

const apiKey = process.env.VIAPAY_API_KEY;
if (!apiKey) {
  console.error("Set VIAPAY_API_KEY (from data/seed.local.json after pnpm db:seed)");
  process.exit(1);
}

const viapay = new ViaPay({
  apiKey,
  baseUrl: process.env.VIAPAY_API_URL ?? "http://localhost:3001",
});

const checkout = await viapay.createCheckout({
  amount: "20.0000000",
  asset: "USDC",
  description: "Pedido ejemplo",
  success_url: "https://example.com/ok",
  cancel_url: "https://example.com/cancel",
});

console.log("Redirect buyer to:", checkout.url);
