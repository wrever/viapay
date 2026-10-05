import { ViaPay } from "@viapay/sdk";
import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalog";
import { shopBaseUrl, viapayApiKey, viapayApiUrl } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { productId?: string };
    const product = getProduct(body.productId ?? "");
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const base = shopBaseUrl();
    const via = new ViaPay({
      apiKey: viapayApiKey(),
      baseUrl: viapayApiUrl(),
    });

    const checkout = await via.createCheckout({
      amount: product.amount,
      asset: product.asset,
      description: product.name,
      success_url: `${base}/success`,
      cancel_url: `${base}/cancel`,
    });

    return NextResponse.json({
      url: checkout.url,
      id: checkout.id,
      client_secret: checkout.clientSecret,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo crear el cobro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
