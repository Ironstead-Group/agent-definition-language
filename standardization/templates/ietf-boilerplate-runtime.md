---
title: "ADL Runtime Protocol"
abbrev: "ADL Runtime"
docname: draft-nederveld-adl-runtime-00
category: std
ipr: trust200902
submissionType: IETF
area: art
workgroup: Individual Submission
keyword:
  - AI agent
  - runtime governance
  - enforcement
  - oversight
  - audit
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
  RFC8174:
  RFC8785:
  ADL-CORE:
    title: "Agent Definition Language (ADL)"
    target: https://adl-spec.org/spec
    author:
      - ins: T. Nederveld
        name: Terrill Nederveld
    seriesinfo:
      Internet-Draft: draft-nederveld-adl
  ADL-TRUST:
    title: "ADL Trust Protocol"
    target: https://adl-spec.org/protocol/trust
    author:
      - ins: T. Nederveld
        name: Terrill Nederveld
    seriesinfo:
      Internet-Draft: draft-nederveld-adl-trust

informative:
  XACML:
    title: "eXtensible Access Control Markup Language (XACML) Version 3.0"
    target: https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-os-en.html
    author:
      - org: OASIS
    date: 2013
  NIST.SP.800-162:
    title: "Guide to Attribute Based Access Control (ABAC) Definition and Considerations"
    target: https://doi.org/10.6028/NIST.SP.800-162
    author:
      - org: National Institute of Standards and Technology
    seriesinfo:
      NIST: "Special Publication 800-162"
    date: 2014
  RFC6962:

--- abstract

The Agent Definition Language (ADL) Runtime Protocol defines the normative
procedures a runtime governor performs to enforce an agent's declared
operational limits while the agent executes: budget and iteration control,
sub-agent and peer admission, oversight triggers, degradation, and anomaly
detection. It binds enforcement to the exact passport admitted at the start
of a session and defines a signed, hash-chained enforcement-evidence record
that makes governance auditable. It is the continuous counterpart to the
admission-time procedures of the ADL Trust Protocol, acting on the
declarations made in the ADL Core description layer.

--- middle

--- back

# Acknowledgments
{:numbered="false"}

TBD
