---
title: "Agent Definition Language (ADL)"
abbrev: "ADL"
docname: draft-nederveld-adl-03
category: std
ipr: trust200902
submissionType: IETF
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
  - ins: T. Nederveld
    name: Terrill Nederveld
    organization: Ironstead Group, LLC.
    email: terry+adl@ironsteadgroup.com

normative:
  RFC2119:
  RFC3986:
  RFC6838:
  RFC6901:
  RFC8126:
  RFC8141:
  RFC8174:
  RFC8259:
  RFC8615:

informative:
  RFC8785:
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
  ISO-22989:
    title: "Information technology -- Artificial intelligence -- Artificial intelligence concepts and terminology"
    target: https://www.iso.org/standard/74296.html
    author:
      - org: ISO/IEC JTC 1/SC 42
    date: 2022
    seriesinfo:
      ISO/IEC: "22989:2022"
  AI-PROTOCOLS:
    title: "Framework, Use Cases and Requirements for AI Agent Protocols"
    target: https://datatracker.ietf.org/doc/html/draft-rosenberg-ai-protocols-00
    author:
      - ins: J. Rosenberg
        name: Jonathan Rosenberg
    date: 2025
    seriesinfo:
      Internet-Draft: draft-rosenberg-ai-protocols-00

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
