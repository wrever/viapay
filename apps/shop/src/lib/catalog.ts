export type Product = {
  id: string;
  name: string;
  description: string;
  amount: string;
  asset: "USDC" | "XLM";
  priceLabel: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "curso-stellar",
    name: "Curso Stellar para creadores",
    description:
      "Producto de prueba. Al pagar, esta tienda te manda al checkout ViaPay y vuelve acá con el resultado.",
    amount: "20.0000000",
    asset: "USDC",
    priceLabel: "20 USDC",
  },
  {
    id: "taller-xlm",
    name: "Taller express (XLM)",
    description:
      "Misma integración con redirect, usando XLM en testnet para probar otra asset.",
    amount: "5.0000000",
    asset: "XLM",
    priceLabel: "5 XLM",
  },
];

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}
