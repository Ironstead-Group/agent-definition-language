"""
ADL Explainer Agent -- Google Generative AI Python SDK implementation.

Uses the google-genai package for the Gemini tool-use loop.
"""

from __future__ import annotations

import json
from typing import Any

from google import genai
from google.genai import types

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

# Build Gemini function declarations from tool definitions
_TOOL_DECLARATIONS: list[types.FunctionDeclaration] = [
    types.FunctionDeclaration(
        name="explain_concept",
        description=(
            "Explain an ADL concept such as the passport model, tools, permissions, "
            "data classification, profiles, lifecycle, security, or extensions."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "concept": types.Schema(
                    type=types.Type.STRING,
                    description="The ADL concept to explain",
                ),
            },
            required=["concept"],
        ),
    ),
    types.FunctionDeclaration(
        name="validate_document",
        description=(
            "Validate an ADL document provided as YAML or JSON and return structured "
            "results with errors explained in plain language."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "document": types.Schema(
                    type=types.Type.STRING,
                    description="The ADL document content as YAML or JSON string",
                ),
            },
            required=["document"],
        ),
    ),
    types.FunctionDeclaration(
        name="show_example",
        description="Return an example ADL document by category: minimal, production, or with-tools.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "category": types.Schema(
                    type=types.Type.STRING,
                    description="The example category to retrieve",
                    enum=["minimal", "production", "with-tools"],
                ),
            },
            required=["category"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_spec_section",
        description="Retrieve information about a specific section of the ADL specification.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "section": types.Schema(
                    type=types.Type.STRING,
                    description="The spec section or topic to look up",
                ),
            },
            required=["section"],
        ),
    ),
    types.FunctionDeclaration(
        name="compare_formats",
        description=(
            "Compare ADL with another agent description format such as A2A, MCP, "
            "OpenAPI, or Agent Protocol."
        ),
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "format": types.Schema(
                    type=types.Type.STRING,
                    description="The format to compare against ADL",
                    enum=["a2a", "mcp", "openai", "agent_protocol"],
                ),
            },
            required=["format"],
        ),
    ),
]

TOOLS = types.Tool(function_declarations=_TOOL_DECLARATIONS)


def _get_function_calls(
    response: types.GenerateContentResponse,
) -> list[tuple[str, dict[str, Any]]]:
    """Extract function call parts from a Gemini response."""
    calls: list[tuple[str, dict[str, Any]]] = []
    for candidate in response.candidates or []:
        for part in candidate.content.parts or []:
            if part.function_call:
                args = dict(part.function_call.args) if part.function_call.args else {}
                calls.append((part.function_call.name, args))
    return calls


def _get_text_content(response: types.GenerateContentResponse) -> str:
    """Extract text content from a Gemini response."""
    texts: list[str] = []
    for candidate in response.candidates or []:
        for part in candidate.content.parts or []:
            if part.text:
                texts.append(part.text)
    return "\n".join(texts)


def run_agent_turn(
    client: genai.Client,
    chat: Any,
    user_message: str,
    model_name: str = "gemini-2.0-flash",
) -> str:
    """Run a single agent turn: send a message, handle tool calls, return final text."""
    response = chat.send_message(user_message)
    function_calls = _get_function_calls(response)

    while function_calls:
        # Execute each function call and build response parts
        function_responses = []
        for name, args in function_calls:
            result_str = execute_tool(name, args)
            result_data = json.loads(result_str)
            function_responses.append(
                types.Part.from_function_response(
                    name=name,
                    response={"result": result_data},
                )
            )

        # Send function responses back
        response = chat.send_message(function_responses)
        function_calls = _get_function_calls(response)

    return _get_text_content(response)
