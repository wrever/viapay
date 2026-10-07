/**
 * SEP-0010 + SEP-24 client via ViaPay API proxies (avoids browser CORS to the anchor).
 * Challenge is signed with Stellar Wallets Kit (Freighter, etc.).
 */

import { API } from "@/lib/config";

export type Sep10Result = {
  token: string;
  web_auth: string;
};

export async function sep10Login(input: {
  webAuth: string;
  account: string;
  networkPassphrase: string;
  sign: (xdr: string, networkPassphrase: string) => Promise<string>;
}): Promise<Sep10Result> {
  const challengeRes = await fetch(`${API}/v1/sep10/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      web_auth: input.webAuth,
      account: input.account,
    }),
  });
  const challengeBody = (await challengeRes.json().catch(() => ({}))) as {
    transaction?: string;
    network_passphrase?: string;
    error?: string;
  };
  if (!challengeRes.ok || !challengeBody.transaction) {
    throw new Error(
      challengeBody.error ??
        `SEP-10 challenge falló (${challengeRes.status})`,
    );
  }

  const passphrase =
    challengeBody.network_passphrase ?? input.networkPassphrase;
  const signedXdr = await input.sign(challengeBody.transaction, passphrase);

  const tokenRes = await fetch(`${API}/v1/sep10/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      web_auth: input.webAuth,
      transaction: signedXdr,
    }),
  });
  const tokenBody = (await tokenRes.json().catch(() => ({}))) as {
    token?: string;
    error?: string;
  };
  if (!tokenRes.ok || !tokenBody.token) {
    throw new Error(
      tokenBody.error ?? `SEP-10 token falló (${tokenRes.status})`,
    );
  }
  return { token: tokenBody.token, web_auth: input.webAuth };
}

/** SEP-24 interactive withdraw URL (opens anchor UI; fiat may be simulated). */
export async function sep24WithdrawInteractive(input: {
  sep24Base: string;
  token: string;
  account: string;
  assetCode: string;
  assetIssuer?: string | null;
}): Promise<{ url: string; id?: string }> {
  const res = await fetch(`${API}/v1/sep24/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sep24: input.sep24Base,
      token: input.token,
      account: input.account,
      asset_code: input.assetCode,
      asset_issuer: input.assetIssuer ?? null,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    id?: string;
    error?: string;
  };
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? `SEP-24 interactive falló (${res.status})`);
  }
  return { url: json.url, id: json.id };
}
