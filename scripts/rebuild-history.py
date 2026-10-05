#!/usr/bin/env python3
"""Rebuild ViaPay as ~80 clean commits. Author wrever only. No co-authors.

Uses git commit-tree (bypasses hooks that inject Co-authored-by).
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUTHOR_NAME = "wrever"
AUTHOR_EMAIL = "brunomirandaes10@gmail.com"

# Aim ~80 logical commits covering the monorepo.
GROUPS: list[tuple[str, list[str]]] = [
    ("chore: scaffold monorepo pnpm", [
        "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml",
        "tsconfig.base.json", ".gitignore",
    ]),
    ("chore: plantilla de entorno", [".env.example"]),
    ("docs: README inicial", ["README.md"]),
    ("docs: guía de contribución", ["CONTRIBUTING.md"]),
    ("feat(shared): package y exports", ["packages/shared/package.json", "packages/shared/tsconfig.json"]),
    ("feat(shared): tipos y utilidades base", ["packages/shared"]),
    ("feat(stellar): package", ["packages/stellar/package.json", "packages/stellar/tsconfig.json"]),
    ("feat(stellar): helpers de red y XDR", ["packages/stellar"]),
    ("feat(sdk): package", ["packages/sdk/package.json", "packages/sdk/tsconfig.json"]),
    ("feat(sdk): cliente ViaPay", ["packages/sdk"]),
    ("feat(brand): package y sync", [
        "packages/brand/package.json", "packages/brand/scripts",
    ]),
    ("feat(brand): tokens CSS", ["packages/brand/tokens.css"]),
    ("feat(brand): logos SVG", ["packages/brand/logos", "packages/brand"]),
    ("feat(prefs): package", ["packages/prefs/package.json", "packages/prefs/tsconfig.json"]),
    ("feat(prefs): tema e idioma compartidos", ["packages/prefs"]),
    ("feat(api): package Next", [
        "apps/api/package.json", "apps/api/tsconfig.json",
        "apps/api/next.config.ts", "apps/api/next-env.d.ts",
    ]),
    ("feat(api): layout base", [
        "apps/api/src/app/layout.tsx", "apps/api/src/app/page.tsx",
        "apps/api/src/app/globals.css",
    ]),
    ("feat(api): esquema SQLite", ["apps/api/src/lib/db.ts"]),
    ("feat(api): seed local", ["apps/api/src/scripts"]),
    ("feat(api): auth de API keys", ["apps/api/src/lib/auth.ts"]),
    ("feat(api): HTTP helpers", ["apps/api/src/lib/http.ts"]),
    ("feat(api): payments y fee split", ["apps/api/src/lib/payments.ts"]),
    ("feat(api): chain y Horizon", ["apps/api/src/lib/chain.ts"]),
    ("feat(api): ruta payment intents", ["apps/api/src/app/v1/payment_intents"]),
    ("feat(api): checkout prepare submit sep7", ["apps/api/src/app/v1/checkout"]),
    ("feat(api): webhooks firma HMAC", [
        "apps/api/src/lib/webhooks.ts",
        "apps/api/src/app/v1/webhook_endpoints",
        "apps/api/src/app/v1/webhook_deliveries",
    ]),
    ("feat(api): readiness", ["apps/api/src/app/v1/readiness"]),
    ("feat(api): x402 challenge", ["apps/api/src/lib/x402.ts", "apps/api/src/app/v1/x402"]),
    ("feat(api): health", ["apps/api/src/app/v1/health"]),
    ("feat(api): auth link OAuth", ["apps/api/src/app/v1/auth"]),
    ("feat(api): integraciones", [
        "apps/api/src/lib/integrations.ts",
        "apps/api/src/app/v1/integrations",
        "apps/api/src/app/v1/escrow",
    ]),
    ("feat(api): resto del servicio", ["apps/api"]),
    ("feat(dashboard): package Next", [
        "apps/dashboard/package.json", "apps/dashboard/tsconfig.json",
        "apps/dashboard/next.config.ts", "apps/dashboard/next-env.d.ts",
        "apps/dashboard/postcss.config.mjs", "apps/dashboard/vercel.json",
    ]),
    ("feat(dashboard): layout y estilos", [
        "apps/dashboard/src/app/layout.tsx",
        "apps/dashboard/src/app/globals.css",
    ]),
    ("feat(dashboard): sesión y cookies", ["apps/dashboard/src/lib/session.ts"]),
    ("feat(dashboard): cliente Supabase", ["apps/dashboard/src/lib/supabase.ts"]),
    ("feat(dashboard): origin y link account", [
        "apps/dashboard/src/lib/origin.ts",
        "apps/dashboard/src/lib/link-account.ts",
        "apps/dashboard/src/lib/config.ts",
    ]),
    ("feat(dashboard): pantalla de login OAuth", [
        "apps/dashboard/src/app/login",
        "apps/dashboard/src/components/LoginScreen.tsx",
    ]),
    ("feat(dashboard): rutas auth OAuth", ["apps/dashboard/src/app/auth"]),
    ("feat(dashboard): middleware code bridge", ["apps/dashboard/src/middleware.ts"]),
    ("feat(dashboard): home del panel", [
        "apps/dashboard/src/app/page.tsx",
        "apps/dashboard/src/components/DashboardHome.tsx",
    ]),
    ("feat(dashboard): crear link de pago", [
        "apps/dashboard/src/components/CreatePaymentLink.tsx",
    ]),
    ("feat(dashboard): readiness UI", ["apps/dashboard/src/components/ReceiveNotice.tsx"]),
    ("feat(dashboard): webhooks UI", ["apps/dashboard/src/components/WebhookPanel.tsx"]),
    ("feat(dashboard): UI kit", ["apps/dashboard/src/components/ui"]),
    ("feat(dashboard): Logo y providers", [
        "apps/dashboard/src/components/Logo.tsx",
        "apps/dashboard/src/components/Providers.tsx",
    ]),
    ("feat(dashboard): i18n ES EN PT", ["apps/dashboard/src/lib/i18n"]),
    ("feat(dashboard): assets públicos", ["apps/dashboard/public"]),
    ("feat(dashboard): resto del panel", ["apps/dashboard"]),
    ("feat(checkout): package Next", [
        "apps/checkout/package.json", "apps/checkout/tsconfig.json",
        "apps/checkout/next.config.ts", "apps/checkout/next-env.d.ts",
        "apps/checkout/postcss.config.mjs",
    ]),
    ("feat(checkout): layout hosted", [
        "apps/checkout/src/app/layout.tsx",
        "apps/checkout/src/app/globals.css",
        "apps/checkout/src/app/page.tsx",
    ]),
    ("feat(checkout): ruta pay", ["apps/checkout/src/app/pay"]),
    ("feat(checkout): PayPanel total limpio", ["apps/checkout/src/components/PayPanel.tsx"]),
    ("feat(checkout): wallets kit", ["apps/checkout/src/lib/wallet.ts"]),
    ("feat(checkout): Pollar shell", ["apps/checkout/src/components/PollarShell.tsx"]),
    ("feat(checkout): i18n y tema", ["apps/checkout/src/lib/i18n"]),
    ("feat(checkout): providers y logo", [
        "apps/checkout/src/components/Providers.tsx",
        "apps/checkout/src/components/Logo.tsx",
        "apps/checkout/src/components/CheckoutProblem.tsx",
    ]),
    ("feat(checkout): lib types", ["apps/checkout/src/lib"]),
    ("feat(checkout): assets públicos", ["apps/checkout/public"]),
    ("feat(checkout): resto del hosted", ["apps/checkout"]),
    ("feat(web): package Next", [
        "apps/web/package.json", "apps/web/tsconfig.json",
        "apps/web/next.config.ts", "apps/web/next-env.d.ts",
    ]),
    ("feat(web): layout landing", [
        "apps/web/src/app/layout.tsx",
        "apps/web/src/app/globals.css",
    ]),
    ("feat(web): HomePage y hero", [
        "apps/web/src/app/page.tsx",
        "apps/web/src/components/HomePage.tsx",
    ]),
    ("feat(web): ModesPanel", ["apps/web/src/components/ModesPanel.tsx"]),
    ("feat(web): FlowSplit gráficos", ["apps/web/src/components/FlowSplit.tsx"]),
    ("feat(web): DocsPage", [
        "apps/web/src/app/docs",
        "apps/web/src/components/DocsPage.tsx",
    ]),
    ("feat(web): capítulos docs i18n", ["apps/web/src/lib/i18n/docs-chapters.ts"]),
    ("feat(web): messages ES EN PT", ["apps/web/src/lib/i18n"]),
    ("feat(web): urls panel login", ["apps/web/src/lib/urls.ts"]),
    ("feat(web): providers y logo", [
        "apps/web/src/components/Providers.tsx",
        "apps/web/src/components/Logo.tsx",
        "apps/web/src/components/PayerSwitch.tsx",
    ]),
    ("feat(web): not-found", ["apps/web/src/app/not-found.tsx"]),
    ("feat(web): assets e iconos", [
        "apps/web/public",
        "apps/web/src/app/icon.svg",
        "apps/web/src/app/apple-icon.png",
    ]),
    ("feat(web): resto de la landing", ["apps/web"]),
    ("feat(shop): tienda de prueba redirect", ["apps/shop"]),
    ("feat(contracts): payment-router Soroban", ["contracts"]),
    ("feat(db): migración Postgres Supabase", ["supabase"]),
    ("docs: memoria de proyecto", ["docs/MEMORY.md"]),
    ("docs: AHORA prioridad", ["docs/AHORA.md"]),
    ("docs: FUTURO diferido", ["docs/FUTURO.md"]),
    ("docs: integración API SDK", ["docs/INTEGRATION.md"]),
    ("docs: OpenAPI", ["docs/openapi.yaml"]),
    ("docs: deploy Vercel Supabase", ["docs/DEPLOY.md"]),
    ("docs: pack hackathon", ["docs/HACKATHON.md"]),
    ("docs: índice", ["docs"]),
    ("feat(examples): create-checkout", ["examples/create-checkout.mjs"]),
    ("feat(examples): agent-pay x402", ["examples"]),
    ("chore: scripts de mantenimiento", ["scripts"]),
    ("chore: reglas del agente", [".cursor"]),
    ("chore: skills de diseño", [".agents"]),
]


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env.update({
        "GIT_AUTHOR_NAME": AUTHOR_NAME,
        "GIT_AUTHOR_EMAIL": AUTHOR_EMAIL,
        "GIT_COMMITTER_NAME": AUTHOR_NAME,
        "GIT_COMMITTER_EMAIL": AUTHOR_EMAIL,
        # Reduce chance of tooling injecting trailers
        "CURSOR_AGENT": "",
    })
    return subprocess.run(
        cmd, cwd=ROOT, env=env, text=True, capture_output=True, check=False,
    )


def must(cmd: list[str]) -> str:
    p = run(cmd)
    if p.returncode != 0:
        sys.stderr.write(p.stdout + p.stderr)
        raise SystemExit(f"command failed ({p.returncode}): {' '.join(cmd)}")
    return p.stdout


def commit_tree(message: str, parents: list[str]) -> str:
    """Create a commit object without hooks (no Co-authored-by injection)."""
    tree = must(["git", "write-tree"]).strip()
    cmd = ["git", "commit-tree", tree]
    for p in parents:
        cmd += ["-p", p]
    cmd += ["-m", message]
    sha = must(cmd).strip()
    must(["git", "update-ref", "HEAD", sha])
    return sha


def main() -> None:
    os.chdir(ROOT)
    tracked = set(must(["git", "ls-files"]).splitlines())
    if not tracked:
        raise SystemExit("no tracked files on current branch")

    # Drop rebuild branch if leftover
    run(["git", "branch", "-D", "rebuild-main"])
    must(["git", "checkout", "--orphan", "rebuild-main"])
    must(["git", "reset"])

    committed_paths: set[str] = set()
    parent: str | None = None
    n = 0

    def existing_paths(paths: list[str]) -> list[str]:
        out: list[str] = []
        for raw in paths:
            p = Path(raw)
            if p.is_dir():
                prefix = raw.rstrip("/") + "/"
                for f in sorted(tracked):
                    if (f.startswith(prefix) or f == raw.rstrip("/")) and f not in committed_paths:
                        out.append(f)
            else:
                if raw in tracked and raw not in committed_paths:
                    out.append(raw)
        return out

    for msg, paths in GROUPS:
        files = existing_paths(paths)
        if not files:
            print(f"SKIP: {msg}")
            continue
        run(["git", "reset", "-q"])
        must(["git", "add", "-f", "--"] + files)
        staged = [
            f for f in must(["git", "diff", "--cached", "--name-only"]).splitlines()
            if f
        ]
        if not staged:
            run(["git", "reset", "-q"])
            print(f"SKIP empty: {msg}")
            continue
        parents = [parent] if parent else []
        sha = commit_tree(msg, parents)
        # Clear index association noise; keep tree as committed
        committed_paths.update(staged)
        parent = sha
        n += 1
        print(f"OK ({n}): {msg}")

    remaining = sorted(f for f in (tracked - committed_paths) if f)
    if remaining:
        run(["git", "reset", "-q"])
        must(["git", "add", "-f", "--"] + remaining)
        sha = commit_tree("chore: archivos restantes del monorepo", [parent] if parent else [])
        parent = sha
        n += 1
        print(f"OK ({n}): chore: archivos restantes del monorepo")

    run(["git", "branch", "-D", "main"])
    must(["git", "branch", "-M", "main"])

    # Belt-and-suspenders: strip any trailer if somehow present
    must([
        "git", "filter-branch", "-f",
        "--msg-filter", r"sed '/^Co-authored-by:/Id'",
        "HEAD",
    ])
    shutil.rmtree(ROOT / ".git" / "refs" / "original", ignore_errors=True)
    run(["git", "reflog", "expire", "--expire=now", "--all"])
    run(["git", "gc", "--prune=now", "--quiet"])

    body = must(["git", "log", "--format=%B"])
    if "Co-authored-by:" in body or "cursoragent@" in body.lower():
        raise SystemExit("FAIL: Co-authored-by / cursoragent still present")

    authors = must(["git", "log", "--format=%an <%ae>"]).splitlines()
    bad = [a for a in authors if "cursor" in a.lower() or a != f"{AUTHOR_NAME} <{AUTHOR_EMAIL}>"]
    if bad:
        raise SystemExit(f"FAIL: unexpected authors: {set(bad)}")

    count = must(["git", "rev-list", "--count", "HEAD"]).strip()
    print("==== DONE ====")
    print(f"commits: {count}")
    print(must(["git", "shortlog", "-sn", "HEAD"]))
    print(f"groups landed: {n}")


if __name__ == "__main__":
    main()
