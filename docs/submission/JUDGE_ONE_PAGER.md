# ViaPay — una página para el jurado

**Qué es:** la **pasarela de cobro completa** non-custodial en Stellar para comercios LATAM.  
No somos un protocolo. Somos el checkout: de punta a cabo.

**Promesa en una frase:** el mismo `payment_intent` lo paga un humano o un agente; el dinero se parte en hasta tres patas en el contrato `payment-router`; el comercio ve panel, link, recibo y hash.

**Probar ya**

1. Panel: https://viapay.vercel.app/app → crear cobro → copiar **un** link.  
2. Browser: abre el link → Freighter → recibo + stellar.expert.  
3. Agente: `curl -i <mismo_link>` → HTTP **402**; mismo cobro.  
4. Health: https://viapay-api.vercel.app/v1/health → `payment_router` = `CDI6XC5Q…`.

**Por qué ganamos el contraste**

| Local402 | Honorarios | **ViaPay** |
|---|---|---|
| App de FX / x402 con precio local | App de reserva fiscal freelance | **Pasarela**: panel + link + split marketplace + humano/agente |

Ellos no son “cobros de comercio”. Nosotros sí.

Counters largos: [`PITCH_KILL.md`](./PITCH_KILL.md) · [`COMPETITORS.md`](./COMPETITORS.md).

**SEPs en demo:** 1 (toml), 41 (SAC/router), 10/24 (anchor test), 55 (en curso). QR clásico off con router (billetera = path canónico).

**Límites honestos:** testnet demo día a día; mainnet evidencia cuando haya hashes; SEP-24 fiat simulado; sin audit.
