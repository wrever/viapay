# Counters vs campo (General Track · ~42 proyectos)

Actualizado: 2026-10-07. Meta: **top-3 / mención**. Oro solo con mainnet + SEP-55 + demo 90s impecable.

## Amenaza real (cuidar)

| Rival | Ellos | Nosotros (frase) |
|---|---|---|
| **Local402** | x402 + FX CLP/UF **mainnet** + Reflector + verified build | Pasarela comercio: panel + split marketplace + **mismo link** humano/agente. No competimos en oracle FX. |
| **Honorarios** | Split fiscal freelancer + mainnet proof + SEP-55 + passkeys | Split **marketplace** (fee + reseller + merchant) + hosted checkout + SDK. No somos tax product. |
| **AgentAllowance** | Allowance on-chain para agentes (budget/revoke) | Cobro de **comercio**: el agente paga un `payment_intent`, no administra tesorería del dueño. |
| **AegisOS** | Provenance de lo que el agente compró (post-x402) | Liquidamos el cobro; no auditamos contenido. Pitch: “nosotros cobramos, ellos prueban entrega”. |
| **SylarPay** | @username + perfiles | Link `pi_…` + `external_user_id` + SDK. No clonamos @user esta semana. |

## Solapamiento bajo (una frase si preguntan)

| Rival | Counter |
|---|---|
| StellaGate | Ya preflight receive/trustline en checkout + TrustlineGate panel. |
| Habeas | Protocolo clawback; nosotros pasarela cobro. |
| Setareh / Vitrinee / OSS402 / Qerin / Axon | Compran/venden con agentes; **pueden usar ViaPay** como rail. |
| AgentPey | Allowance/identity agente ≠ checkout comercio. |
| XReceipt | Recibo firmado; nosotros recibo de split 3 patas + hash. |
| Hazina / Breadline / Nkwado | Escrow/marketplace vertical; nosotros link de cobro general. |
| PayID / Cosmos Wallet / Walletnow | Identidad/wallet infra; nosotros merchant checkout. |
| CobraFi / Invaria / VeriFire / LCRD / Fortgate | Otro vertical (factoring, evidencia RWA, score, AML). |
| Invaria, XDRParity, Soroban Studio, Xlm CLI | Tooling/infra; no pasarela. |
| MycoTracker / E4C / Music / etc. | Fuera de payments. |

## Favoritos oro del campo

1. Local402 (mainnet + profundidad x402/FX)  
2. Honorarios (mainnet + SEP-55 + narrativa fiscal clara)  
3. Posible: AgentAllowance / AegisOS si el jurado premia “agent stack” puro  

## Ángulo ViaPay (repetir)

> No somos un protocolo. Somos la **pasarela de cobro completa**: panel → un link → humano o agente → split en payment-router → hash.  
> Local402 y Honorarios son apps de nicho (FX / tax). Nosotros cobramos el negocio de punta a cabo.

Kill sheet: [`PITCH_KILL.md`](./PITCH_KILL.md).

## NO hacer para “ganar”

Clonar Reflector/exact-fx · @username · KYC real · escrow Trustless como pitch · más features fuera del demo 90s.
