"""
ADL Explainer Agent -- OpenAI Python SDK implementation.

Uses the openai package for the GPT tool-use loop.
"""

from __future__ import annotations

import json
from typing import Any

from openai import OpenAI

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
        "type": "function",
        "function": {
            "name": "explain_concept",
            "description": (
                "Explain an ADL concept such as the passport model, tools, permissions, "
                "data classification, profiles, lifecycle, security, or extensions."
            ),
            "parameters": {
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
    },
    {
        "type": "function",
        "function": {
            "name": "validate_document",
            "description": (
                "Validate an ADL document provided as YAML or JSON and return structured "
                "results with errors explained in plain language."
            ),
            "parameters": {
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
    },
    {
        "type": "function",
        "function": {
            "name": "show_example",
            "description": "Return an example ADL document by category: minimal, production, or with-tools.",
            "parameters": {
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
    },
    {
        "type": "function",
        "function": {
            "name": "get_spec_section",
            "description": "Retrieve information about a specific section of the ADL specification.",
            "parameters": {
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
    },
    {
        "type": "function",
        "function": {
            "name": "compare_formats",
            "description": (
                "Compare ADL with another agent description format such as A2A, MCP, "
                "OpenAPI, or Agent Protocol."
            ),
            "parameters": {
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
    },
]


def run_agent_turn(
    client: OpenAI,
    messages: list[dict[str, Any]],
    model: str = "gpt-4o",
    max_tokens: int = 4096,
) -> str:
    """Run a single agent turn: send messages, handle tool calls, return final text."""
    response = client.chat.completions.create(
        model=model,
        max_tokens=max_tokens,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
    )

    choice = response.choices[0]

    while choice.finish_reason == "tool_calls" and choice.message.tool_calls:
        messages.append(choice.message)

        for tool_call in choice.message.tool_calls:
            result = execute_tool(
                tool_call.function.name,
                json.loads(tool_call.function.arguments),
            )
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

        response = client.chat.completions.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        choice = response.choices[0]

    messages.append(choice.message)
    return choice.message.content or ""
