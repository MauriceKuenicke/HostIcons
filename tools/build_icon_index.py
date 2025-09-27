#!/usr/bin/env python3
"""Build a central icons index JSON from SVG files.

Usage:
  python tools/build_icon_index.py --icons-dir ./icons --out ./data/icons.json
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

LIGHT_SUFFIX = "_l.svg"
DARK_SUFFIX = "_d.svg"


@dataclass(frozen=True)
class IconRecord:
    icn_name: str
    icn_loc: str
    theme: str  # "light" or "dark"

    def to_dict(self) -> Dict[str, str]:
        return {"icn_name": self.icn_name, "icn_loc": self.icn_loc, "theme": self.theme}


def infer_from_filename(path: Path) -> IconRecord | None:
    name = path.name
    lower = name.lower()
    if lower.endswith(LIGHT_SUFFIX):
        base = name[:-len(LIGHT_SUFFIX)]
        return IconRecord(icn_name=f"{base}_light", icn_loc=f"./icons/{name}", theme="light")
    if lower.endswith(DARK_SUFFIX):
        base = name[:-len(DARK_SUFFIX)]
        return IconRecord(icn_name=f"{base}_dark", icn_loc=f"./icons/{name}", theme="dark")
    return None


def build_index(icons_dir: Path) -> Tuple[List[IconRecord], List[str]]:
    warnings: List[str] = []
    records: List[IconRecord] = []

    if not icons_dir.exists():
        warnings.append(f"Icons directory not found: {icons_dir}")
        return [], warnings

    for p in sorted(icons_dir.rglob("*.svg")):
        rec = infer_from_filename(p)
        if rec is None:
            warnings.append(f"Irregular filename (ignored): {p.name}")
            continue
        records.append(rec)

    # Detect duplicates by icn_name and icn_loc
    seen_name: Dict[str, int] = {}
    seen_loc: Dict[str, int] = {}
    for r in records:
        seen_name[r.icn_name] = seen_name.get(r.icn_name, 0) + 1
        seen_loc[r.icn_loc] = seen_loc.get(r.icn_loc, 0) + 1
    for k, c in seen_name.items():
        if c > 1:
            warnings.append(f"Duplicate icn_name: {k} ({c} occurrences)")
    for k, c in seen_loc.items():
        if c > 1:
            warnings.append(f"Duplicate icn_loc: {k} ({c} occurrences)")

    # Check missing pairs per basename
    by_base: Dict[str, Dict[str, bool]] = {}
    for r in records:
        if r.theme == "light":
            base = r.icn_name[:-len("_light")]
            by_base.setdefault(base, {}).setdefault("light", True)
        else:
            base = r.icn_name[:-len("_dark")]
            by_base.setdefault(base, {}).setdefault("dark", True)
    for base, flags in by_base.items():
        has_l = flags.get("light", False)
        has_d = flags.get("dark", False)
        if has_l and not has_d:
            warnings.append(f"Missing dark pair for: {base}")
        if has_d and not has_l:
            warnings.append(f"Missing light pair for: {base}")

    # Sort by icn_name
    records.sort(key=lambda r: r.icn_name)
    return records, warnings


def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="Build icons index JSON")
    parser.add_argument("--icons-dir", default="./icons", help="Directory with SVG icons")
    parser.add_argument("--out", default="./data/icons.json", help="Output JSON path")
    args = parser.parse_args(argv)

    icons_dir = Path(args.icons_dir)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    records, warnings = build_index(icons_dir)

    # Stats
    count_light = sum(1 for r in records if r.theme == "light")
    count_dark = sum(1 for r in records if r.theme == "dark")
    total = len(records)

    data = [r.to_dict() for r in records]

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Wrote {out_path} ({total} icons: {count_light} light, {count_dark} dark)")
    if warnings:
        print("Warnings:")
        for w in warnings:
            print(f" - {w}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
