#!/usr/bin/env python3
"""Cria ou atualiza o workflow Replica Health Alert no n8n.

Uso:
  python3 tools/publicar-replica-health-alert.py
  python3 tools/publicar-replica-health-alert.py --dry-run
  python3 tools/publicar-replica-health-alert.py --run

Requer N8N_API_KEY. Copia a URL do Telegram a partir do Pokemon Health Alert
(mesmo @eduardo_alerta_bot / mesmo chat privado). Nao imprime o token.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

BASE = "https://srv1897392.hstgr.cloud"
HA_ID = "3irgeWFKZGZZrJ5u"
WF_ID_FIXO = "NNBuoFo1gCl0GO00"
NOME = "Replica Health Alert"
ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "backups/2026-09-02/sql/replica-health-alert--consultar-saude.sql"
JS = ROOT / "backups/2026-09-02/code-nodes/replica-health-alert--avaliar-saude.js"


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
            raw = resp.read()
            body = json.loads(raw) if raw else {}
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        raise SystemExit(f"{method} {path} -> {e.code}\n{body[:2000]}") from e


def node_by_name(wf, name):
    for n in wf.get("nodes") or []:
        if n.get("name") == name:
            return n
    return None


def find_id():
    _, wfs = api("/api/v1/workflows?limit=250")
    for w in wfs.get("data") or []:
        if w.get("name") == NOME or w.get("id") == WF_ID_FIXO:
            return w.get("id")
    return None


def telegram_node_from(source_wf):
    n = node_by_name(source_wf, "Notify Telegram Privado")
    if not n:
        raise SystemExit("node Notify Telegram Privado ausente na origem")
    url = (n.get("parameters") or {}).get("url") or ""
    if "api.telegram.org/bot" not in url or "/sendMessage" not in url:
        raise SystemExit("URL do Telegram inesperada na origem (nao copiada)")
    copiado = json.loads(json.dumps(n))
    copiado["id"] = str(uuid.uuid4())
    copiado["position"] = [1120, 96]
    copiado["name"] = "Notify Telegram Privado"
    return copiado


def montar_nodes(telegram, sql, js):
    def nid():
        return str(uuid.uuid4())

    manual = {
        "id": nid(),
        "name": "Manual Trigger",
        "type": "n8n-nodes-base.manualTrigger",
        "typeVersion": 1,
        "position": [0, 0],
        "parameters": {},
    }
    agenda = {
        "id": nid(),
        "name": "A cada 30 min",
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.3,
        "position": [0, 192],
        "parameters": {
            "rule": {"interval": [{"field": "minutes", "minutesInterval": 30}]}
        },
    }
    sql_node = {
        "id": nid(),
        "name": "Consultar Saude da Replica",
        "type": "n8n-nodes-base.postgres",
        "typeVersion": 2.6,
        "position": [280, 96],
        "parameters": {"operation": "executeQuery", "query": sql, "options": {}},
        "credentials": {
            "postgres": {"id": "6jdqiaTfNIJseSqb", "name": "Pokemon Promos DB"}
        },
        "retryOnFail": True,
        "maxTries": 3,
        "waitBetweenTries": 2000,
    }
    code = {
        "id": nid(),
        "name": "Avaliar Saude",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [560, 96],
        "parameters": {
            "mode": "runOnceForAllItems",
            "language": "javaScript",
            "jsCode": js,
        },
    }
    iff = {
        "id": nid(),
        "name": "Deve Notificar?",
        "type": "n8n-nodes-base.if",
        "typeVersion": 2.3,
        "position": [840, 96],
        "parameters": {
            "conditions": {
                "combinator": "and",
                "options": {
                    "caseSensitive": True,
                    "leftValue": "",
                    "typeValidation": "loose",
                    "version": 2,
                },
                "conditions": [
                    {
                        "id": "deve",
                        "leftValue": "={{ $json.deve_notificar }}",
                        "rightValue": True,
                        "operator": {"type": "boolean", "operation": "true"},
                    }
                ],
            }
        },
    }
    sticky = {
        "id": nid(),
        "name": "Sticky Replica Alert",
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": [-40, -160],
        "parameters": {
            "content": (
                "## Replica Health Alert\n"
                "Avisa no **mesmo chat privado** do LinkedIn via `@eduardo_alerta_bot`.\n"
                "Nunca publica em `@promopokemontcg`.\n"
                "Agenda 30 min; o mesmo sintoma no maximo a cada 3h. Manual sempre manda."
            ),
            "color": 5,
            "width": 420,
            "height": 140,
        },
    }
    return [manual, agenda, sql_node, code, iff, telegram, sticky]


def connections():
    return {
        "Manual Trigger": {
            "main": [[{"node": "Consultar Saude da Replica", "type": "main", "index": 0}]]
        },
        "A cada 30 min": {
            "main": [[{"node": "Consultar Saude da Replica", "type": "main", "index": 0}]]
        },
        "Consultar Saude da Replica": {
            "main": [[{"node": "Avaliar Saude", "type": "main", "index": 0}]]
        },
        "Avaliar Saude": {
            "main": [[{"node": "Deve Notificar?", "type": "main", "index": 0}]]
        },
        "Deve Notificar?": {
            "main": [[{"node": "Notify Telegram Privado", "type": "main", "index": 0}]]
        },
    }


def put_or_post(wf_id, body):
    if wf_id:
        return api(f"/api/v1/workflows/{wf_id}", "PUT", body)
    return api("/api/v1/workflows", "POST", body)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--run", action="store_true", help="dispara uma execucao manual depois de publicar")
    args = parser.parse_args()

    sql = SQL.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    if "6280219693" not in js:
        raise SystemExit("JS sem o chatId do alerta LinkedIn")

    _, ha = api(f"/api/v1/workflows/{HA_ID}")
    telegram = telegram_node_from(ha)
    nodes = montar_nodes(telegram, sql, js)
    body = {
        "name": NOME,
        "nodes": nodes,
        "connections": connections(),
        "settings": {
            "executionOrder": "v1",
            "availableInMCP": True,
            "timezone": "America/Sao_Paulo",
        },
    }

    wf_id = find_id()
    print(f"origem Telegram: Pokemon Health Alert {HA_ID} (token nao impresso)")
    print(f"workflow destino: {wf_id or '(criar)'}")
    print(f"sql={SQL.stat().st_size} js={JS.stat().st_size}")
    if args.dry_run:
        print("dry-run: nao gravou")
        return

    status, saved = put_or_post(wf_id, body)
    new_id = saved.get("id") or wf_id
    print(f"gravado HTTP {status} id={new_id} versionId={saved.get('versionId')}")
    _, act = api(f"/api/v1/workflows/{new_id}/activate", "POST")
    print(
        f"ativo={act.get('active')} versionId={act.get('versionId')} "
        f"activeVersionId={act.get('activeVersionId')}"
    )
    if act.get("versionId") != act.get("activeVersionId"):
        raise SystemExit("versionId != activeVersionId depois do activate")

    if args.run:
        tentativas = [
            (f"/api/v1/workflows/{new_id}/run", "POST", {}),
            (f"/api/v1/workflows/{new_id}/execute", "POST", {}),
        ]
        ok = False
        for path, method, payload in tentativas:
            try:
                st, out = api(path, method, payload)
                print(f"execucao {method} {path} -> {st} keys={list(out)[:8]}")
                ok = True
                break
            except SystemExit as e:
                print(str(e)[:300])
        if not ok:
            print(
                "nao deu para disparar por API; abra o workflow e clique Execute workflow"
            )
            print(f"{BASE}/workflow/{new_id}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
