---
id: overview
title: Overview
sidebar_position: 1
description: The Governance Profile extends ADL for regulated enterprise environments with compliance tracking and audit trails.
keywords: [adl, governance, compliance, soc2, nist, iso, enterprise]
---

# Governance Profile

<div className="profile-badge">

| | |
|---|---|
| **Identifier** | `urn:adl:profile:governance:1.0` |
| **Status** | Draft |
| **ADL Compatibility** | 0.1.x |

</div>

:::info Profile Status
This profile is in **draft** status. The specification is stable for early adoption, but minor changes may occur before 1.0.
:::

## Overview

The Governance Profile extends ADL for regulated enterprise environments. It adds members for compliance frameworks, AI governance, operational governance, and registry metadata.

When this profile is declared in an ADL document's `profiles` array, the document **MUST** satisfy all requirements defined in this specification.

## Use Cases

- Enterprise AI agent registries
- Regulatory compliance tracking
- AI governance and oversight
- Audit trail management
- Multi-framework compliance mapping

## Quick Start

Add the Governance Profile to your ADL document:

```json
{
  "adl_spec": "0.1.0",
  "name": "Compliance Review Agent",
  "description": "Reviews documents for regulatory compliance.",
  "version": "1.0.0",
  "profiles": ["urn:adl:profile:governance:1.0"],
  "compliance_framework": {
    "primary_framework": "SOC2_TYPE_II",
    "control_mappings": [
      {
        "framework": "SOC2",
        "control_id": "CC6.1",
        "status": "implemented"
      }
    ]
  }
}
```

## Additional Members

The Governance Profile adds the following top-level members:

| Member | Required | Description |
|--------|----------|-------------|
| `compliance_framework` | **REQUIRED** | Compliance and regulatory framework information |
| `ai_governance` | Optional | AI-specific governance requirements |
| `governance` | Optional | Operational governance information |
| `registry_metadata` | Optional | Registry information for enterprise agent catalogs |

See the [full specification](./specification) for detailed member definitions.

## Supported Compliance Frameworks

The profile supports the following compliance frameworks:

- `NIST_800_53` - NIST Special Publication 800-53
- `SOC2_TYPE_II` - SOC 2 Type II
- `ISO_27001` - ISO/IEC 27001 Information Security
- `ISO_42001` - ISO/IEC 42001 AI Management System
- `GDPR` - General Data Protection Regulation
- `HIPAA` - Health Insurance Portability and Accountability Act
- `PCI_DSS` - Payment Card Industry Data Security Standard
- `EU_AI_ACT` - EU Artificial Intelligence Act
