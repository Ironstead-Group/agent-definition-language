---
title: "Agent Definition Language (ADL)"
abbrev: "ADL"
docname: draft-adl-00
category: std
ipr: trust200902
area: art
workgroup: Individual Submission
keyword:
  - AI agent
  - agent description
  - interoperability
  - JSON
stand_alone: yes
pi:
  toc: yes
  sortrefs: yes
  symrefs: yes
  compact: yes

author:
  -
    ins: J. Doe
    name: Jane Doe
    organization: Ironstead Group, LLC
    email: jane@example.com

normative:
  RFC2119:
  RFC3986:
  RFC6901:
  RFC8174:
  RFC8259:
  RFC8785:

informative:
  A2A:
    title: "Agent-to-Agent Protocol Specification"
    target: https://a2a-protocol.org/specification
    author:
      - org: A2A Protocol Working Group
    date: 2025
  JSON-SCHEMA:
    title: "JSON Schema: A Media Type for Describing JSON Documents"
    target: https://json-schema.org/draft/2020-12/json-schema-core
    author:
      - ins: A. Wright
        name: Austin Wright
    date: 2020
  MCP:
    title: "Model Context Protocol Specification"
    target: https://modelcontextprotocol.io/specification
    author:
      - org: Anthropic
    date: 2024
  OPENAPI:
    title: "OpenAPI Specification"
    target: https://spec.openapis.org/oas/v3.1.0
    author:
      - org: OpenAPI Initiative
    date: 2024
  W3C.DID:
    title: "Decentralized Identifiers (DIDs) v1.0"
    target: https://www.w3.org/TR/did-core/
    author:
      - ins: M. Sporny
        name: Manu Sporny
    date: 2022
  W3C.VC:
    title: "Verifiable Credentials Data Model v1.1"
    target: https://www.w3.org/TR/vc-data-model/
    author:
      - ins: M. Sporny
        name: Manu Sporny
    date: 2022

--- abstract

The Agent Definition Language (ADL) provides a standard JSON-based format
for describing AI agents. An ADL document declares an agent's identity,
capabilities, tools, permissions, security requirements, data
classification, and runtime configuration in a single, machine-readable
artifact. ADL enables discovery, interoperability, deployment, and
lifecycle management of AI agents across diverse platforms and runtimes.
This document defines the structure of ADL documents, the semantics of
their members, conformance requirements for implementations, and the
registration of the application/adl+json media type.

--- middle

--- back
