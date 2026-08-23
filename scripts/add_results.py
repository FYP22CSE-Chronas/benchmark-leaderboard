#!/usr/bin/env python3

import argparse
import csv
import os
import sys

FIELDS = ["model", "dataset", "level", "scrps"]

DEFAULT_TARGET = os.path.join(os.path.dirname(__file__), "..", "src", "data", "experiments.csv")

PURPOSE_LEVELS = {
    "Labour": 0,
    "Traffic": 0,
    "Tourism-S": 0,
    "Tourism-L": 4,
    "Wiki": 1,
    "Favorita": 0,
}


def level_labels(count, purpose):
    geo = count - purpose
    return [f"{i + 1} ({'geo.' if i < geo else 'prp.'})" for i in range(count)]


def read_run(path):
    with open(path, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    if not rows:
        sys.exit(f"{path}: no rows")
    if "level" not in rows[0]:
        sys.exit(f"{path}: missing a 'level' column")
    value_col = next((c for c in ("scrps", "mean") if c in rows[0]), None)
    if value_col is None:
        sys.exit(f"{path}: missing a 'scrps' (or 'mean') column")

    overall = [r for r in rows if r["level"].strip().lower() == "overall"]
    levels = [r for r in rows if r["level"].strip().lower() != "overall"]
    if not overall:
        sys.exit(f"{path}: no 'Overall' row -- the benchmark table needs one")
    return overall[0], levels, value_col


def main():
    ap = argparse.ArgumentParser(
        description="Write one experiment run into the results CSV the leaderboard reads.")
    ap.add_argument("model", help='model name as it should appear in the table, e.g. "CLOVER (crps)"')
    ap.add_argument("dataset", help="dataset name, e.g. Labour")
    ap.add_argument("run", help="path to the run's level,scrps CSV (a 'mean' column is accepted too)")
    ap.add_argument("--target", default=DEFAULT_TARGET, help="results CSV to update (default: experiments.csv)")
    ap.add_argument("--purpose-levels", type=int, default=None,
                    help="how many trailing levels are purpose-based (default: known per dataset, else 0)")
    ap.add_argument("--decimals", type=int, default=4, help="decimal places for stored values (default: 4)")
    args = ap.parse_args()

    overall, levels, value_col = read_run(args.run)
    purpose = args.purpose_levels
    if purpose is None:
        purpose = PURPOSE_LEVELS.get(args.dataset, 0)
    if purpose > len(levels):
        sys.exit(f"--purpose-levels {purpose} exceeds the {len(levels)} levels in {args.run}")

    def num(row):
        raw = (row.get(value_col) or "").strip()
        return "" if raw == "" else f"{float(raw):.{args.decimals}f}"

    fresh = [{"model": args.model, "dataset": args.dataset, "level": "Overall", "scrps": num(overall)}]
    for label, row in zip(level_labels(len(levels), purpose), levels):
        fresh.append({"model": args.model, "dataset": args.dataset, "level": label, "scrps": num(row)})

    existing = []
    if os.path.exists(args.target):
        with open(args.target, newline="", encoding="utf-8") as fh:
            existing = list(csv.DictReader(fh))

    def mine(r):
        return r["model"] == args.model and r["dataset"] == args.dataset

    at = next((i for i, r in enumerate(existing) if mine(r)), None)
    if at is None:
        at = next((i for i, r in enumerate(existing) if r["model"] == args.model), len(existing))
        while at < len(existing) and existing[at]["model"] == args.model:
            at += 1

    kept = [r for r in existing if not mine(r)]
    at -= sum(1 for r in existing[:at] if mine(r))
    merged = kept[:at] + fresh + kept[at:]

    with open(args.target, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(merged)

    print(f"{args.model} / {args.dataset}: {len(fresh)} rows -> {os.path.normpath(args.target)}")


if __name__ == "__main__":
    main()
