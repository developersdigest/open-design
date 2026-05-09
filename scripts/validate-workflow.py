#!/usr/bin/env python3
"""Validate an n8n workflow JSON for structural correctness.

Usage: python3 scripts/validate-workflow.py [path/to/workflow.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

DEFAULT_PATH = "workflow/brand-api.json"
REQUIRED_WORKFLOW_KEYS = ["id", "name", "nodes", "connections", "active"]
REQUIRED_NODE_KEYS = ["id", "name", "type", "position", "parameters"]
REQUIRED_ROUTES = ["brand/decode", "brand/design", "brand/html", "brand/assets"]
WEBHOOK_TYPE = "n8n-nodes-base.webhook"
RESPOND_TYPE = "n8n-nodes-base.respondToWebhook"


class Checker:
    def __init__(self) -> None:
        self.passed = 0
        self.total = 0

    def check(self, label: str, ok: bool, reason: str = "") -> bool:
        self.total += 1
        if ok:
            self.passed += 1
            print(f"[OK] {label}")
        else:
            print(f"[FAIL {reason}] {label}")
        return ok


def reachable_respond(start: str, connections: dict[str, Any], nodes_by_name: dict[str, dict]) -> bool:
    seen: set[str] = set()
    stack = [start]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        node = nodes_by_name.get(cur)
        if node and node.get("type") == RESPOND_TYPE:
            return True
        outs = connections.get(cur, {}).get("main", []) or []
        for branch in outs:
            for edge in branch or []:
                tgt = edge.get("node")
                if tgt and tgt not in seen:
                    stack.append(tgt)
    return False


def validate(path: Path) -> int:
    c = Checker()

    # 1. JSON parse
    try:
        raw = path.read_text()
        data = json.loads(raw)
        c.check("file parses as JSON", True)
    except Exception as e:
        c.check("file parses as JSON", False, f"parse error: {e}")
        print(f"\n{c.passed}/{c.total} checks passed")
        return 1

    # 2. Top-level list with one workflow
    is_single_list = isinstance(data, list) and len(data) == 1 and isinstance(data[0], dict)
    c.check("top-level is a list with exactly one workflow object", is_single_list,
            f"got {type(data).__name__} len={len(data) if isinstance(data, list) else 'n/a'}")
    if not is_single_list:
        print(f"\n{c.passed}/{c.total} checks passed")
        return 1
    wf = data[0]

    # 3. Workflow keys
    missing_keys = [k for k in REQUIRED_WORKFLOW_KEYS if k not in wf]
    c.check(f"workflow has required keys {REQUIRED_WORKFLOW_KEYS}",
            not missing_keys, f"missing: {missing_keys}")

    nodes = wf.get("nodes", [])
    connections = wf.get("connections", {}) or {}

    # 4. Nodes non-empty + required keys per node
    nodes_valid = isinstance(nodes, list) and len(nodes) > 0
    bad_nodes: list[str] = []
    if nodes_valid:
        for i, n in enumerate(nodes):
            missing = [k for k in REQUIRED_NODE_KEYS if k not in n]
            if missing:
                bad_nodes.append(f"node[{i}] {n.get('name', '?')} missing {missing}")
    c.check("nodes is non-empty and every node has required keys",
            nodes_valid and not bad_nodes,
            f"empty={not nodes_valid} bad={bad_nodes}")

    # 5. Unique names
    names = [n.get("name") for n in nodes]
    dupes = sorted({n for n in names if names.count(n) > 1})
    c.check("every node name is unique", not dupes, f"duplicates: {dupes}")

    nodes_by_name: dict[str, dict] = {n["name"]: n for n in nodes if "name" in n}

    # 6. Connection targets exist
    bad_targets: list[str] = []
    for src, conn in connections.items():
        for branch in conn.get("main", []) or []:
            for edge in branch or []:
                tgt = edge.get("node")
                if tgt not in nodes_by_name:
                    bad_targets.append(f"{src} -> {tgt}")
    c.check("all connection targets refer to existing nodes",
            not bad_targets, f"orphans: {bad_targets}")

    # 7. Webhook nodes: unique paths + responseNode has downstream respondToWebhook
    webhook_nodes = [n for n in nodes if n.get("type") == WEBHOOK_TYPE]
    paths = [n.get("parameters", {}).get("path") for n in webhook_nodes]
    dup_paths = sorted({p for p in paths if paths.count(p) > 1})
    missing_respond: list[str] = []
    for n in webhook_nodes:
        params = n.get("parameters", {})
        if params.get("responseMode") == "responseNode":
            if not reachable_respond(n["name"], connections, nodes_by_name):
                missing_respond.append(n["name"])
    c.check("webhook nodes have unique paths and responseNode webhooks reach a respondToWebhook",
            not dup_paths and not missing_respond,
            f"dup_paths={dup_paths} missing_respond={missing_respond}")

    # 8. Each webhook entry path reaches a respondToWebhook
    unreachable: list[str] = []
    for n in webhook_nodes:
        if not reachable_respond(n["name"], connections, nodes_by_name):
            unreachable.append(n.get("parameters", {}).get("path") or n["name"])
    c.check("every webhook entry path terminates in respondToWebhook",
            not unreachable, f"unreachable: {unreachable}")

    # 9. Required brand routes
    present_paths = {p for p in paths if p}
    missing_routes = [r for r in REQUIRED_ROUTES if r not in present_paths]
    c.check(f"required brand routes exist {REQUIRED_ROUTES}",
            not missing_routes, f"missing: {missing_routes}")

    # 10. No node positioned at [0, 0]
    zero_pos = [n.get("name") for n in nodes if n.get("position") == [0, 0]]
    c.check("no node has position [0, 0]", not zero_pos, f"at origin: {zero_pos}")

    print(f"\n{c.passed}/{c.total} checks passed")
    return 0 if c.passed == c.total else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate an n8n workflow JSON.")
    ap.add_argument("path", nargs="?", default=DEFAULT_PATH,
                    help=f"path to workflow JSON (default: {DEFAULT_PATH})")
    args = ap.parse_args()
    path = Path(args.path)
    if not path.exists():
        print(f"[FAIL not-found] {path}")
        return 1
    return validate(path)


if __name__ == "__main__":
    sys.exit(main())
