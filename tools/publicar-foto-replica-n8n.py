#!/usr/bin/env python3
"""Atualiza o Replica WhatsApp Ingest: foto oficial do ML no destino."""
from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

BASE = "https://srv1897392.hstgr.cloud"
WF_ID = "4mE343XrNXgIwAIF"
KEY = os.environ["N8N_API_KEY"]
ROOT = Path("/workspace")


def api(path: str, method: str = "GET", payload=None):
    url = BASE + path
    headers = {"X-N8N-API-KEY": KEY, "Accept": "application/json"}
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"{method} {path} -> {e.code}\n{body[:2000]}") from e


def node_by_name(wf, name):
    for n in wf["nodes"]:
        if n.get("name") == name:
            return n
    raise SystemExit(f"node ausente: {name}")


def main():
    status, wf = api(f"/api/v1/workflows/{WF_ID}")
    print("GET", status, wf["name"], "active", wf.get("active"), "version", wf.get("versionId"), "activeVersion", wf.get("activeVersionId"))

    preparar = (ROOT / "backups/2026-09-02/code-nodes/replica-ingest--preparar-card.js").read_text()
    normalizar = (ROOT / "backups/2026-09-02/code-nodes/replica-ingest--normalizar-url-foto.js").read_text()

    node_by_name(wf, "Preparar Card")["parameters"]["jsCode"] = preparar
    node_by_name(wf, "Normalizar URL da Foto")["parameters"]["jsCode"] = normalizar

    buscar = node_by_name(wf, "Buscar Item no Mercado Livre")
    buscar["parameters"] = {
        "method": "GET",
        "url": "={{ $json.url_item }}",
        "sendHeaders": True,
        "specifyHeaders": "keypair",
        "headerParameters": {
            "parameters": [
                {"name": "User-Agent", "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"},
                {"name": "Accept", "value": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"},
                {"name": "Accept-Language", "value": "pt-BR,pt;q=0.9,en;q=0.8"},
                {"name": "Upgrade-Insecure-Requests", "value": "1"},
            ]
        },
        "options": {
            "timeout": 15000,
            "response": {
                "response": {
                    "fullResponse": True,
                    "neverError": True,
                    "responseFormat": "text",
                }
            },
        },
    }
    buscar["onError"] = "continueErrorOutput"

    sticky = node_by_name(wf, "Sticky Note e0c3b87e")
    sticky.setdefault("parameters", {})["content"] = (
        "## Saida\n\n"
        "Foto oficial do anuncio no Mercado Livre (pagina do produto), mesmo se a origem veio so com texto. "
        "Se a pagina falhar, tenta a foto da origem. Sem as duas, sai como texto. "
        "Sem parse_mode no sentido de inventar layout: a foto do anuncio vai inteira."
    )

    conns = wf["connections"]
    foto_if = conns["Tem Foto Para Copiar?"]["main"]
    # main#0 true, main#1 false
    foto_if[0] = [{"node": "Tem Foto do ML?", "type": "main", "index": 0}]
    print("Tem Foto Para Copiar? true ->", [x["node"] for x in foto_if[0]])
    print("Tem Foto Para Copiar? false ->", [x["node"] for x in foto_if[1]])

    body = {
        "name": wf["name"],
        "nodes": wf["nodes"],
        "connections": wf["connections"],
        "settings": wf.get("settings") or {},
        "staticData": wf.get("staticData"),
    }
    if wf.get("pinData") is not None:
        body["pinData"] = wf["pinData"]
    if wf.get("description"):
        body["description"] = wf["description"]

    put_status, saved = api(f"/api/v1/workflows/{WF_ID}", "PUT", body)
    print("PUT", put_status, "version", saved.get("versionId"), "activeVersion", saved.get("activeVersionId"), "active", saved.get("active"))

    act_status, act = api(f"/api/v1/workflows/{WF_ID}/activate", "POST", {})
    print("ACTIVATE", act_status, "active", act.get("active"), "version", act.get("versionId"), "activeVersion", act.get("activeVersionId"))

    _, check = api(f"/api/v1/workflows/{WF_ID}")
    print("CHECK active", check.get("active"), "version==active", check.get("versionId") == check.get("activeVersionId"), check.get("versionId"), check.get("activeVersionId"))

    # verify connections and snippets
    nprep = node_by_name(check, "Preparar Card")
    assert "paginaProduto" in nprep["parameters"]["jsCode"]
    nnorm = node_by_name(check, "Normalizar URL da Foto")
    assert "fotoDoHtml" in nnorm["parameters"]["jsCode"]
    nbus = node_by_name(check, "Buscar Item no Mercado Livre")
    assert nbus["parameters"]["url"] == "={{ $json.url_item }}"
    dest = check["connections"]["Tem Foto Para Copiar?"]["main"][0][0]["node"]
    assert dest == "Tem Foto do ML?", dest
    print("OK workflow atualizado")


if __name__ == "__main__":
    main()
