#!/usr/bin/env python3
"""Publica Code/SQL do Replica WhatsApp Ingest a partir dos arquivos versionados.

Uso:
  python3 tools/publicar-ingest-n8n.py

Requer N8N_API_KEY. PUT sem binaryMode em settings (400 se mandar).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = "https://srv1897392.hstgr.cloud"
WF_ID = "4mE343XrNXgIwAIF"
ROOT = Path(__file__).resolve().parents[1]
NOS = {
    "Montar Post": ROOT / "backups/2026-09-02/code-nodes/replica-ingest--montar-post.js",
    "Consultar Rota e Config": ROOT / "backups/2026-09-02/sql/replica-ingest--consultar-rota-e-config.sql",
}


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
    return api(f"/api/v1/workflows/{WF_ID}", "PUT", body)


def main():
    _, wf = api(f"/api/v1/workflows/{WF_ID}")
    for nome, caminho in NOS.items():
        texto = caminho.read_text(encoding="utf-8")
        node = node_by_name(wf, nome)
        if caminho.suffix == ".sql":
            node.setdefault("parameters", {})["query"] = texto
        else:
            node.setdefault("parameters", {})["jsCode"] = texto
        print("node", nome, "bytes", len(texto))
    _, saved = put_workflow(wf)
    api(f"/api/v1/workflows/{WF_ID}/activate", "POST", {})
    _, check = api(f"/api/v1/workflows/{WF_ID}")
    js = node_by_name(check, "Montar Post")["parameters"]["jsCode"]
    sql = node_by_name(check, "Consultar Rota e Config")["parameters"]["query"]
    assert "plataforma_nao_selecionada" in js
    assert "CONVERSORES" in js
    assert "chave = 'plataformas'" in sql
    ok = check.get("active") and check.get("versionId") == check.get("activeVersionId")
    print(
        "CHECK active", check.get("active"),
        "version==active", check.get("versionId") == check.get("activeVersionId"),
        check.get("versionId"),
    )
    if not ok:
        raise SystemExit("ingest nao ficou publicado")
    print("OK ingest")


if __name__ == "__main__":
    sys.exit(main())
