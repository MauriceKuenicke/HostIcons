from __future__ import annotations

import hashlib
import json
import os
from typing import List, Dict

from flask import Blueprint, current_app, render_template, send_from_directory, jsonify, request, Response

main_bp = Blueprint("main", __name__)

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
DATA_PATH = os.path.join(ROOT_DIR, "data", "icons.json")
ICONS_DIR = os.path.join(ROOT_DIR, "icons")


def _load_icons() -> List[Dict]:
    """
    Load icons metadata from JSON file.

    Returns:
        List[Dict]: List of icon records.
    """
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Validate minimal shape
        out: List[Dict] = []
        for rec in data:
            if not isinstance(rec, dict):
                continue
            if {"icn_name", "icn_loc", "theme"}.issubset(rec.keys()):
                out.append(rec)
        return out
    except FileNotFoundError:
        return []


def _icons_etag() -> str:
    """Compute a weak ETag based on icons.json metadata file properties."""
    try:
        stat = os.stat(DATA_PATH)
        base = f"{stat.st_mtime_ns}-{stat.st_size}"
    except FileNotFoundError:
        base = current_app.config.get("APP_START_TIME", "0")
    return "W/\"" + hashlib.sha256(base.encode("utf-8")).hexdigest()[:16] + "\""


@main_bp.route("/")
def index() -> str:
    return render_template("index.html")


@main_bp.route("/icons/<path:filename>")
def icons_static(filename: str):
    return send_from_directory(ICONS_DIR, filename)


@main_bp.route("/api/icons")
def api_icons():
    icons = _load_icons()
    etag = _icons_etag()

    if request.if_none_match and etag in request.if_none_match:
        return Response(status=304, headers={"ETag": etag, "Cache-Control": "private, max-age=60"})

    resp = jsonify(icons)
    resp.headers["Cache-Control"] = "private, max-age=60"
    resp.headers["ETag"] = etag
    return resp


@main_bp.route("/healthz")
def healthz():
    return jsonify({"status": "ok"})


