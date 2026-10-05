export function shopBaseUrl() {
  return (
    process.env.SHOP_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_SHOP_URL ??
    "http://localhost:3005"
  ).replace(/\/$/, "");
}

export function viapayApiUrl() {
  return (
    process.env.VIAPAY_API_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_API_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export function viapayApiKey() {
  const key = process.env.VIAPAY_API_KEY;
  if (!key) {
    throw new Error(
      "Falta VIAPAY_API_KEY. Corré `pnpm db:seed` y pegá api_key de data/seed.local.json en apps/shop/.env.local",
    );
  }
  return key;
}
