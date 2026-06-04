---
title: "ADL Trust Protocol"
abbrev: "ADL Trust"
docname: draft-nederveld-adl-trust-00
category: std
ipr: trust200902
submissionType: IETF
area: art
workgroup: Individual Submission
keyword:
  - AI agent
  - agent passport
  - trust
  - authentication
  - authorization
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
  RFC6648:
  RFC6750:
  RFC8126:
  RFC8174:
  RFC8785:
  RFC9110:
  W3C.DID-WEB:
    title: "did:web Method Specification"
    target: https://w3c-ccg.github.io/did-method-web/
    author:
      - org: W3C Credentials Community Group
  ADL-CORE:
    title: "Agent Definition Language (ADL)"
    target: https://adl-spec.org/spec
    author:
      - ins: T. Nederveld
        name: Terrill Nederveld
    seriesinfo:
      Internet-Draft: draft-nederveld-adl

informative:
  RFC8693:
  RFC9449:

--- abstract

The Agent Definition Language (ADL) Trust Protocol defines the normative
procedures a counterparty performs to establish trust in an agent described
by ADL: verifying the agent's passport, binding a request to a presentation
proof, and authorizing agent-to-agent calls. It is the procedural layer that
acts on the declarations made in the ADL Core description layer, giving a
declared limit force at the moment one agent admits another. This document
specifies passport verification, presentation-proof binding, authorization
across single and multi-hop flows, and the associated conformance
requirements.

--- middle

--- back

# Acknowledgments
{:numbered="false"}

TBD
