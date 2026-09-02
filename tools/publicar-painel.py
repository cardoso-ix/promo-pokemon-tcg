#!/usr/bin/env python3
"""Publica o HTML do Replica Painel em producao.

Uso:
  python3 tools/publicar-painel.py
  python3 tools/publicar-painel.py --login
  python3 tools/publicar-painel.py --dry-run

O que faz:
  1. Valida o HTML (sem aspas duplas nem barra invertida, com __DADOS__).
  2. Grava o base64 UTF-8 em replica_config.pagina_gz via POST /config.
  3. Abre a whitelist so durante o POST; pagina_gz nao fica permanente nela.
  4. Confere versionId = activeVersionId.

Com --login, tambem regrava o node Montar Pagina Login a partir de
backups/2026-08-28/painel/replica-login.html.

Requer N8N_API_KEY. O token de save vem de REPLICA_PAINEL_SAVE_TOKEN ou do
fallback ja usado pelos nodes do painel (nao colar o valor na documentacao).
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://srv1897392.hstgr.cloud"
PAINEL_ID = "lWDnggRX8xQmYyQV"
ROOT = Path(__file__).resolve().parents[1]
HTML_PAINEL = ROOT / "backups/2026-08-28/painel/replica-painel.html"
HTML_LOGIN = ROOT / "backups/2026-08-28/painel/replica-login.html"
FALLBACK = os.environ.get("REPLICA_PAINEL_SAVE_TOKEN", "").strip() or (
    "a71e4f516c59fea873e4b07b92e8f26008f215a2dd406f30"
)


def api(path: str, method: str = "GET", payload=None, timeout=90):
    key = os.environ.get("N8N_API_KEY", "").strip()
    if not key:
        raise SystemExit("N8N_API_KEY ausente")
    headers = {"X-N8N-API-KEY": key, "Accept": "application/json"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(BASE + path, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"{method} {path} -> {e.code}\n{body[:2000]}") from e


def node_by_name(wf, name):
    for n in wf["nodes"]:
        if n.get("name") == name:
            return n
    raise SystemExit(f"node ausente: {name}")


def put_workflow(wf):
    settings = wf.get("settings") or {}
    body = {
        "name": wf["name"],
        "nodes": wf["nodes"],
        "connections": wf["connections"],
        "settings": {
            k: settings[k]
            for k in ("executionOrder", "availableInMCP", "timezone")
            if k in settings
        },
        "staticData": wf.get("staticData"),
    }
    if wf.get("pinData") is not None:
        body["pinData"] = wf["pinData"]
    if wf.get("description"):
        body["description"] = wf["description"]
    return api(f"/api/v1/workflows/{PAINEL_ID}", "PUT", body)


def validar_html(path: Path, precisa_dados: bool) -> str:
    if not path.exists():
        raise SystemExit(f"arquivo ausente: {path}")
    html = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    ruins = []
    for i, linha in enumerate(html.splitlines(), 1):
        if '"' in linha or "\\" in linha:
            ruins.append(f"  linha {i}: {linha.strip()[:120]}")
    if ruins:
        raise SystemExit("HTML com aspas duplas ou barra invertida:\n" + "\n".join(ruins[:20]))
    if precisa_dados and "__DADOS__" not in html:
        raise SystemExit(f"{path} sem o marcador __DADOS__")
    if "</html>" not in html:
        raise SystemExit(f"{path} sem </html>")
    return html


def resumo_html(html: str) -> str:
    raw = html.encode("utf-8")
    gz = base64.b64encode(raw).decode("ascii")
    return (
        f"html={len(raw)} bytes  pagina_gz={len(gz)}  "
        f"md5_html={hashlib.md5(raw).hexdigest()}  "
        f"md5_gz={hashlib.md5(gz.encode('ascii')).hexdigest()}"
    )


def patch_permitidas(js: str, incluir: bool) -> str:
    marker = "  limite_legenda_telegram: 'inteiro'\n};"
    with_html = "  limite_legenda_telegram: 'inteiro',\n  pagina_gz: 'html'\n};"
    html_branch = "} else if (tipo === 'html') {\n  valor = valor.slice(0, 200000);\n"
    if incluir:
        if "pagina_gz: 'html'" not in js:
            if marker not in js:
                raise SystemExit("PERMITIDAS sem limite_legenda_telegram")
            js = js.replace(marker, with_html, 1)
        if "tipo === 'html'" not in js:
            if "} else if (tipo === 'json_longo') {" not in js:
                raise SystemExit("Normalizar Config sem ramo json_longo")
            js = js.replace(
                "} else if (tipo === 'json_longo') {",
                html_branch + "} else if (tipo === 'json_longo') {",
                1,
            )
        return js
    js = js.replace(with_html, marker, 1)
    js = js.replace(html_branch, "")
    return js


def post_config(chave: str, valor: str):
    body = json.dumps({"token": FALLBACK, "chave": chave, "valor": valor}).encode("utf-8")
    req = urllib.request.Request(
        BASE + "/webhook/replica/painel/config",
        method="POST",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, resp.read()[:400]
    except urllib.error.HTTPError as e:
        raise SystemExit(
            f"POST config -> {e.code}\n{e.read()[:2000].decode('utf-8', 'replace')}"
        ) from e


def gerar_login_js(html: str) -> str:
    linhas = ",\n".join(f"  {json.dumps(linha)}" for linha in html.split("\n"))
    return (
        "// Replica Painel -> node Montar Pagina Login\n"
        "// GERADO POR tools/publicar-painel.py --login A PARTIR DE "
        "backups/2026-08-28/painel/replica-login.html\n"
        "const PAGINA = [\n"
        f"{linhas}\n"
        "];\n"
        "return [{ json: { html: PAGINA.join(String.fromCharCode(10)) } }];\n"
    )


def conferir(wf):
    ok = wf.get("active") and wf.get("versionId") == wf.get("activeVersionId")
    print(
        "CHECK active", wf.get("active"),
        "version==active", wf.get("versionId") == wf.get("activeVersionId"),
        wf.get("versionId"),
    )
    if not ok:
        raise SystemExit("painel nao ficou publicado (active/versionId)")


def publicar_html(dry: bool):
    html = validar_html(HTML_PAINEL, precisa_dados=True)
    print(resumo_html(html))
    if dry:
        print("dry-run: HTML do painel ok, nada publicado")
        return
    gz = base64.b64encode(html.encode("utf-8")).decode("ascii")
    _, wf = api(f"/api/v1/workflows/{PAINEL_ID}")
    cfg = node_by_name(wf, "Normalizar Config")
    cfg["parameters"]["jsCode"] = patch_permitidas(cfg["parameters"]["jsCode"], True)
    _, saved = put_workflow(wf)
    _, act = api(f"/api/v1/workflows/{PAINEL_ID}/activate", "POST", {})
    print("PUT whitelist temporaria", saved.get("versionId"), "active", act.get("active"))
    st, raw = post_config("pagina_gz", gz)
    print("POST pagina_gz", st, raw[:150])

    _, wf2 = api(f"/api/v1/workflows/{PAINEL_ID}")
    node_by_name(wf2, "Normalizar Config")["parameters"]["jsCode"] = patch_permitidas(
        node_by_name(wf2, "Normalizar Config")["parameters"]["jsCode"], False
    )
    _, saved2 = put_workflow(wf2)
    api(f"/api/v1/workflows/{PAINEL_ID}/activate", "POST", {})
    _, check = api(f"/api/v1/workflows/{PAINEL_ID}")
    js_c = node_by_name(check, "Normalizar Config")["parameters"]["jsCode"]
    if "pagina_gz: 'html'" in js_c:
        raise SystemExit("pagina_gz ficou na whitelist — reverter na mao")
    conferir(check)
    print("OK painel HTML")


def publicar_login(dry: bool):
    html = validar_html(HTML_LOGIN, precisa_dados=False)
    print("login", resumo_html(html))
    js = gerar_login_js(html)
    dest = ROOT / "backups/2026-09-02/code-nodes/replica-painel--montar-pagina-login.js"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(js, encoding="utf-8")
    print("escreveu", dest, "bytes", len(js))
    if dry:
        print("dry-run: login gerado, nada publicado")
        return
    _, wf = api(f"/api/v1/workflows/{PAINEL_ID}")
    node_by_name(wf, "Montar Pagina Login")["parameters"]["jsCode"] = js
    _, saved = put_workflow(wf)
    api(f"/api/v1/workflows/{PAINEL_ID}/activate", "POST", {})
    _, check = api(f"/api/v1/workflows/{PAINEL_ID}")
    print("PUT login", saved.get("versionId"))
    conferir(check)
    print("OK login")


def main(argv=None):
    parser = argparse.ArgumentParser(description="Publica o HTML do Replica Painel")
    parser.add_argument("--login", action="store_true", help="Tambem republica a tela /webhook/replica/entrar")
    parser.add_argument("--dry-run", action="store_true", help="So valida, nao grava no n8n")
    args = parser.parse_args(argv)
    publicar_html(args.dry_run)
    if args.login:
        publicar_login(args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
