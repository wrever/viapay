# ViaPay — una página para el jurado

**Qué es:** pasarela de cobro non-custodial en Stellar para comercios LATAM.

**Promesa en una frase:** el mismo `payment_intent` lo paga un humano o un agente; el dinero se parte en hasta tres patas en el contrato `payment-router`; queda un hash verificable.

**Probar ya**

1. Panel: https://viapay.vercel.app/app → crear cobro → copiar **un** link.  
2. Browser: abre el link → Freighter → recibo + stellar.expert.  
3. Agente: `curl -i <mismo_link>` → HTTP **402** con split; liquidar con `examples/agent-pay.mjs`.  
4. Health: https://viapay-api.vercel.app/v1/health → `payment_router` = `CDI6XC5Q…`.

**Por qué no somos Local402 / Honorarios / AgentAllowance**

- Local402 = FX/oráculo/mainnet x402. Nosotros = checkout comercio + marketplace split.  
- Honorarios = reserva fiscal freelancer. Nosotros = fee plataforma + reseller + comercio.  
- AgentAllowance = presupuesto del agente. Nosotros = cobrar un intent.

**SEPs:** 1 (toml), 7 (legado QR off con router), 10/24 demo anchor, 41 SAC, 55 en curso.

**Límites:** testnet-first; mainnet 1-tx pendiente; sin audit; SEP-24 fiat simulado.
