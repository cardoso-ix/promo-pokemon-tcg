#!/usr/bin/env python3
"""[LEGADO] Injeta o HTML do painel com titulo da oferta e conserta o save_token.

Use tools/publicar-painel.py para republicar o HTML. Este arquivo ficou so
como registro da correcao pontual de 02/09 (titulo nos logs + token de save).
"""
from __future__ import annotations

import base64
import json
import os
import urllib.request
from pathlib import Path

BASE = "https://srv1897392.hstgr.cloud"
PAINEL_ID = "lWDnggRX8xQmYyQV"
KEY = os.environ["N8N_API_KEY"]
ROOT = Path("/workspace")
FALLBACK = "a71e4f516c59fea873e4b07b92e8f26008f215a2dd406f30"


def api(path: str, method: str = "GET", payload=None, timeout=90):
    headers = {"X-N8N-API-KEY": KEY, "Accept": "application/json"}
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
        "settings": {k: settings[k] for k in ("executionOrder", "availableInMCP", "timezone") if k in settings},
        "staticData": wf.get("staticData"),
    }
    if wf.get("pinData") is not None:
        body["pinData"] = wf["pinData"]
    if wf.get("description"):
        body["description"] = wf["description"]
    return api(f"/api/v1/workflows/{PAINEL_ID}", "PUT", body)


def patch_montar_token(js: str) -> str:
    old = "let tokenSave = '';\ntry {\n  if (typeof $env !== 'undefined' && $env.REPLICA_PAINEL_SAVE_TOKEN) {\n    tokenSave = String($env.REPLICA_PAINEL_SAVE_TOKEN).trim();\n  }\n} catch (e) {}\ndados.save_token = tokenSave;"
    new = (
        "let tokenSave = '" + FALLBACK + "';\n"
        "try {\n"
        "  if (typeof $env !== 'undefined' && $env.REPLICA_PAINEL_SAVE_TOKEN) {\n"
        "    const v = String($env.REPLICA_PAINEL_SAVE_TOKEN).trim();\n"
        "    if (v) tokenSave = v;\n"
        "  }\n"
        "} catch (e) {}\n"
        "dados.save_token = tokenSave;"
    )
    if old not in js:
        raise SystemExit("bloco tokenSave nao encontrado em Montar Pagina")
    return js.replace(old, new, 1)


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
            return resp.status, resp.read()[:300]
    except urllib.error.HTTPError as e:
        raise SystemExit(f"POST config -> {e.code}\n{e.read()[:2000].decode('utf-8', 'replace')}") from e


def main():
    html_path = ROOT / "backups/2026-08-28/painel/replica-painel.html"
    html = html_path.read_text()
    if '"' in html or "\\" in html:
        raise SystemExit("HTML com aspas duplas ou barra invertida")
    if "tituloDoLog" not in html:
        raise SystemExit("HTML sem tituloDoLog")
    gz = base64.b64encode(html.encode("utf-8")).decode("ascii")
    print("pagina_gz", len(gz))

    _, wf = api(f"/api/v1/workflows/{PAINEL_ID}")
    montar = node_by_name(wf, "Montar Pagina")
    (ROOT / "backups/2026-09-02/code-nodes/replica-painel--montar-pagina.js").write_text(montar["parameters"]["jsCode"])
    montar["parameters"]["jsCode"] = patch_montar_token(montar["parameters"]["jsCode"])
    cfg = node_by_name(wf, "Normalizar Config")
    cfg["parameters"]["jsCode"] = patch_permitidas(cfg["parameters"]["jsCode"], True)
    _, saved = put_workflow(wf)
    _, act = api(f"/api/v1/workflows/{PAINEL_ID}/activate", "POST", {})
    print("PUT token+html", saved.get("versionId"), "active", act.get("active"))

    st, raw = post_config("pagina_gz", gz)
    print("POST pagina_gz", st, raw[:150])

    _, wf2 = api(f"/api/v1/workflows/{PAINEL_ID}")
    node_by_name(wf2, "Normalizar Config")["parameters"]["jsCode"] = patch_permitidas(
        node_by_name(wf2, "Normalizar Config")["parameters"]["jsCode"], False
    )
    _, saved2 = put_workflow(wf2)
    _, act2 = api(f"/api/v1/workflows/{PAINEL_ID}/activate", "POST", {})
    _, check = api(f"/api/v1/workflows/{PAINEL_ID}")
    js_m = node_by_name(check, "Montar Pagina")["parameters"]["jsCode"]
    js_c = node_by_name(check, "Normalizar Config")["parameters"]["jsCode"]
    assert FALLBACK in js_m
    assert "pagina_gz: 'html'" not in js_c
    print(
        "CHECK active", check.get("active"),
        "version==active", check.get("versionId") == check.get("activeVersionId"),
        check.get("versionId"),
    )
    print("OK painel")


if __name__ == "__main__":
    main()
