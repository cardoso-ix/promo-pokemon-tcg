#!/usr/bin/env python3
"""Publica titulo na legenda da replica e o destaque no painel."""
from __future__ import annotations

import base64
import json
import os
import re
import urllib.request
from pathlib import Path

BASE = "https://srv1897392.hstgr.cloud"
INGEST_ID = "4mE343XrNXgIwAIF"
PAINEL_ID = "lWDnggRX8xQmYyQV"
KEY = os.environ["N8N_API_KEY"]
ROOT = Path("/workspace")

LOGS_OLD = """             links_convertidos,
             LEFT(COALESCE(texto_publicado, texto_original, ''), 160) AS trecho"""

LOGS_NEW = """             links_convertidos,
             CASE
               WHEN BTRIM(split_part(COALESCE(texto_publicado, texto_original, ''), E'\\n', 1))
                    ~ '^(❌|👉🏼|👉|🏷️|🔗|🛒|http)'
               THEN NULL
               ELSE NULLIF(
                 BTRIM(regexp_replace(split_part(COALESCE(texto_publicado, texto_original, ''), E'\\n', 1), '[_*~]', '', 'g')),
                 ''
               )
             END AS titulo,
             LEFT(COALESCE(texto_publicado, texto_original, ''), 160) AS trecho"""


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


def put_workflow(wf_id, wf):
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
    return api(f"/api/v1/workflows/{wf_id}", "PUT", body)


def activate(wf_id):
    return api(f"/api/v1/workflows/{wf_id}/activate", "POST", {})


def publicar_ingest():
    _, wf = api(f"/api/v1/workflows/{INGEST_ID}")
    montar = (ROOT / "backups/2026-09-02/code-nodes/replica-ingest--montar-post.js").read_text()
    node_by_name(wf, "Montar Post")["parameters"]["jsCode"] = montar
    _, saved = put_workflow(INGEST_ID, wf)
    _, act = activate(INGEST_ID)
    _, check = api(f"/api/v1/workflows/{INGEST_ID}")
    js = node_by_name(check, "Montar Post")["parameters"]["jsCode"]
    assert "injetarTitulo" in js
    assert "dadosDoPolycard" in js
    print(
        "INGEST active", check.get("active"),
        "version==active", check.get("versionId") == check.get("activeVersionId"),
        check.get("versionId"),
    )


def patch_permitidas(js: str, incluir_html: bool) -> str:
    if incluir_html:
        if "pagina_gz:" in js:
            return js
        js = js.replace(
            "  frases_remover: 'texto_longo'\n};",
            "  frases_remover: 'texto_longo',\n  pagina_gz: 'html'\n};",
        )
        if "tipo === 'html'" not in js:
            js = js.replace(
                "} else if (tipo === 'texto_longo') {\n  valor = valor.slice(0, 800);\n} else {\n  valor = valor.slice(0, 200);\n}",
                "} else if (tipo === 'texto_longo') {\n  valor = valor.slice(0, 800);\n} else if (tipo === 'html') {\n  valor = valor.slice(0, 200000);\n} else {\n  valor = valor.slice(0, 200);\n}",
            )
        return js
    js = js.replace("  frases_remover: 'texto_longo',\n  pagina_gz: 'html'\n};", "  frases_remover: 'texto_longo'\n};")
    js = js.replace("} else if (tipo === 'html') {\n  valor = valor.slice(0, 200000);\n", "")
    return js


def token_do_ultimo_get():
    _, ex = api("/api/v1/executions?workflowId=" + PAINEL_ID + "&limit=8")
    for e in ex.get("data") or []:
        if e.get("status") != "success":
            continue
        _, d = api(f"/api/v1/executions/{e.get('id')}?includeData=true")
        run = ((d.get("data") or {}).get("resultData") or {}).get("runData") or {}
        if "Montar Pagina" not in run:
            continue
        items = (((run["Montar Pagina"][-1].get("data") or {}).get("main") or [[]])[0]) or []
        if not items:
            continue
        html = str(items[0].get("json", {}).get("html") or "")
        m = re.search(r"<script id='dados' type='application/json'>([^<]+)</script>", html)
        if not m:
            continue
        dados = json.loads(base64.b64decode(m.group(1)))
        token = str(dados.get("save_token") or "").strip()
        if token:
            return token
    raise SystemExit("nao achei save_token no GET do painel")


def post_config(token: str, chave: str, valor: str):
    body = json.dumps({"token": token, "chave": chave, "valor": valor}).encode("utf-8")
    req = urllib.request.Request(
        BASE + "/webhook/replica/painel/config",
        method="POST",
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, resp.read()[:500]
    except urllib.error.HTTPError as e:
        raise SystemExit(f"POST config -> {e.code}\n{e.read()[:2000].decode('utf-8', 'replace')}") from e


def publicar_painel():
    html = (ROOT / "backups/2026-08-28/painel/replica-painel.html").read_text()
    if '"' in html or "\\" in html:
        raise SystemExit("HTML com aspas duplas ou barra invertida")
    if "tituloDoLog" not in html:
        raise SystemExit("HTML sem tituloDoLog")
    gz = base64.b64encode(html.encode("utf-8")).decode("ascii")
    print("pagina_gz bytes", len(gz), "html", len(html.encode("utf-8")))

    _, wf = api(f"/api/v1/workflows/{PAINEL_ID}")
    carregar = node_by_name(wf, "Carregar Dados")
    query = carregar["parameters"]["query"]
    if " AS titulo," not in query:
        if LOGS_OLD not in query:
            raise SystemExit("bloco de logs nao encontrado no Carregar Dados")
        carregar["parameters"]["query"] = query.replace(LOGS_OLD, LOGS_NEW, 1)
    orig_js = node_by_name(wf, "Normalizar Config")["parameters"]["jsCode"]
    node_by_name(wf, "Normalizar Config")["parameters"]["jsCode"] = patch_permitidas(orig_js, True)
    _, saved = put_workflow(PAINEL_ID, wf)
    _, act = activate(PAINEL_ID)
    print("PAINEL allow html", saved.get("versionId"), "active", act.get("active"))

    token = token_do_ultimo_get()
    st, raw = post_config(token, "pagina_gz", gz)
    print("POST pagina_gz", st, raw[:120])

    _, wf2 = api(f"/api/v1/workflows/{PAINEL_ID}")
    node_by_name(wf2, "Normalizar Config")["parameters"]["jsCode"] = patch_permitidas(
        node_by_name(wf2, "Normalizar Config")["parameters"]["jsCode"], False
    )
    _, saved2 = put_workflow(PAINEL_ID, wf2)
    _, act2 = activate(PAINEL_ID)
    _, check = api(f"/api/v1/workflows/{PAINEL_ID}")
    q = node_by_name(check, "Carregar Dados")["parameters"]["query"]
    js = node_by_name(check, "Normalizar Config")["parameters"]["jsCode"]
    assert " AS titulo," in q
    assert "pagina_gz" not in js
    print(
        "PAINEL active", check.get("active"),
        "version==active", check.get("versionId") == check.get("activeVersionId"),
        check.get("versionId"),
    )


if __name__ == "__main__":
    publicar_ingest()
    publicar_painel()
    print("OK titulo da oferta e painel atualizados")
