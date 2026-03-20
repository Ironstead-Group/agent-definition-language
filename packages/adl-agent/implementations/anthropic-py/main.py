#!/usr/bin/env python3
"""
ADL Explainer Agent -- Anthropic Python SDK CLI entry point.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import yaml

import anthropic
from agent import run_agent_turn


def self_check() -> bool:
    """Load and validate the agent's own ADL passport."""
    passport_path = Path(__file__).resolve().parent / ".." / ".." / "agent.adl.yaml"
    try:
        with open(passport_path, encoding="utf-8") as f:
            doc = yaml.safe_load(f)
    except Exception as exc:
        print(f"Self-check FAILED: could not load agent passport: {exc}", file=sys.stderr)
        return False

    required = ["adl_spec", "name", "description", "version", "data_classification"]
    missing = [field for field in required if field not in doc]
    if missing:
        print(
            f"Self-check FAILED: passport missing required fields: {', '.join(missing)}",
            file=sys.stderr,
        )
        return False

    return True


def main() -> None:
    print("Welcome to the ADL Spec Explainer!")
    print("Ask me anything about the Agent Definition Language.")
    print('Type "exit" or "quit" to leave.\n')

    ok = self_check()
    if ok:
        print("Self-check passed: agent passport is valid ADL.\n")
    else:
        print("Warning: self-check failed. The agent will still run, but the passport may have issues.\n")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable is not set.", file=sys.stderr)
        print("Set it with: export ANTHROPIC_API_KEY=your-key-here", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic()
    messages: list = []

    while True:
        try:
            user_input = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue

        if user_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break

        messages.append({"role": "user", "content": user_input})

        try:
            response = run_agent_turn(client, messages)
            print(f"\n{response}\n")
        except Exception as exc:
            print(f"\nError: {exc}\n", file=sys.stderr)
            messages.pop()


if __name__ == "__main__":
    main()
