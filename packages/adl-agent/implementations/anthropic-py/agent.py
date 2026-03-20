"""
ADL Explainer Agent -- Anthropic Python SDK implementation.

Uses the anthropic package for the Claude API tool-use loop.
"""

from __future__ import annotations

import json
from typing import Any

import anthropic

from tools import execute_tool

SYSTEM_PROMPT = (
    "You are the ADL Spec Explainer, an expert on the Agent Definition Language (ADL).\n"
    "\n"
    "You help users:\n"
    "- Understand ADL concepts (the passport model, tools, permissions, data classification, "
    "profiles, lifecycle, security, extensions)\n"
    "- Validate their ADL documents and explain any errors in plain language\n"
    "- Explore example ADL documents\n"
    "- Navigate the ADL specification\n"
    "- Compare ADL with other agent description formats (A2A, MCP, OpenAPI, Agent Protocol)\n"
    "\n"
    "Always be clear, accurate, and helpful. When explaining validation errors, provide "
    "actionable guidance on how to fix them. Use the available tools to look up information "
    "rather than relying on memory alone.\n"
    "\n"
    "ADL documents are YAML or JSON files that describe AI agents -- like a passport that "
    "travels with the agent, declaring its identity, capabilities, permissions, and trust signals."
)

TOOLS: list[dict[str, Any]] = [
    {
        "name": "explain_concept",
        "description": (
            "Explain an ADL concept such as the passport model, tools, permissions, "
            "data classification, profiles, lifecycle, security, or extensions."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "concept": {
                    "type": "string",
                    "description": "The ADL concept to explain",
                },
            },
            "required": ["concept"],
        },
    },
    {
        "name": "validate_document",
        "description": (
            "Validate an ADL document provided as YAML or JSON and return structured "
            "results with errors explained in plain language."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "document": {
                    "type": "string",
                    "description": "The ADL document content as YAML or JSON string",
                },
            },
            "required": ["document"],
        },
    },
    {
        "name": "show_example",
        "description": "Return an example ADL document by category: minimal, production, or with-tools.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["minimal", "production", "with-tools"],
                    "description": "The example category to retrieve",
                },
            },
            "required": ["category"],
        },
    },
    {
        "name": "get_spec_section",
        "description": "Retrieve information about a specific section of the ADL specification.",
        "input_schema": {
            "type": "object",
            "properties": {
                "section": {
                    "type": "string",
                    "description": "The spec section or topic to look up",
                },
            },
            "required": ["section"],
        },
    },
    {
        "name": "compare_formats",
        "description": (
            "Compare ADL with another agent description format such as A2A, MCP, "
            "OpenAPI, or Agent Protocol."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "format": {
                    "type": "string",
                    "enum": ["a2a", "mcp", "openai", "agent_protocol"],
                    "description": "The format to compare against ADL",
                },
            },
            "required": ["format"],
        },
    },
]


def run_agent_turn(
    client: anthropic.Anthropic,
    messages: list[dict[str, Any]],
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 4096,
) -> str:
    """Run a single agent turn: send messages, handle tool calls, return final text."""
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=messages,
    )

    while response.stop_reason == "tool_use":
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in tool_use_blocks:
            result = execute_tool(block.name, block.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result,
            })

        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

    messages.append({"role": "assistant", "content": response.content})

    text_parts = [b.text for b in response.content if b.type == "text"]
    return "\n".join(text_parts)
