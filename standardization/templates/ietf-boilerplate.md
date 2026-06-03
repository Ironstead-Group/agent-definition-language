---
title: "Agent Definition Language (ADL)"
abbrev: "ADL"
docname: draft-nederveld-adl-04
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
  RFC6749:
  RFC6838:
  RFC6901:
  RFC7636:
  RFC8126:
  RFC8141:
  RFC8174:
  RFC8259:
  RFC8615:
  RFC8705:
  RFC8785:
  RFC9449:
  RFC9700:

informative:
  A2A:
    title: "Agent2Agent (A2A) Protocol Specification"
    target: https://a2a-protocol.org/latest/specification/
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
  OAUTH2.1:
    title: "The OAuth 2.1 Authorization Framework"
    target: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1
    author:
      - ins: A. Parecki
        name: Aaron Parecki
    date: 2025
    seriesinfo:
      Internet-Draft: draft-ietf-oauth-v2-1
  OPENAPI:
    title: "OpenAPI Specification"
    target: https://spec.openapis.org/oas/v3.1.0
    author:
      - org: OpenAPI Initiative
    date: 2024
  OPENID-CONNECT:
    title: "OpenID Connect Core 1.0"
    target: https://openid.net/specs/openid-connect-core-1_0.html
    author:
      - ins: N. Sakimura
        name: Nat Sakimura
    date: 2014
  W3C.DID:
    title: "Decentralized Identifiers (DIDs) v1.0"
    target: https://www.w3.org/TR/did-core/
    author:
      - ins: M. Sporny
        name: Manu Sporny
    date: 2022
  W3C.VC:
    title: "Verifiable Credentials Data Model v2.0"
    target: https://www.w3.org/TR/vc-data-model-2.0/
    author:
      - ins: M. Sporny
        name: Manu Sporny
    date: 2025
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
  CLTC-AGENTIC:
    title: "Agentic AI Risk-Management Standards Profile"
    target: https://cltc.berkeley.edu/wp-content/uploads/2026/02/Agentic-AI-Risk-Management-Standards-Profile.pdf
    author:
      - org: Center for Long-Term Cybersecurity (CLTC), UC Berkeley
    date: 2026
  IMDA-AGENTIC:
    title: "Model AI Governance Framework for Agentic AI"
    target: https://www.imda.gov.sg/-/media/imda/files/about/emerging-tech-and-research/artificial-intelligence/mgf-for-agentic-ai.pdf
    author:
      - org: Infocomm Media Development Authority (IMDA)
    date: 2026

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
