---
id: production
title: Production Agent
sidebar_position: 4
description: A complete production-ready ADL document with identity, permissions, security, and all optional features.
keywords: [adl, production, example, security, permissions, complete]
---

import CodeTabs from '@site/src/components/CodeTabs';
import productionYaml from '@site/_yaml-sources/examples/production.yaml';
import productionJson from '@site/_yaml-sources/examples/production.json';
import identityYaml from '@site/_yaml-sources/snippets/production/identity.yaml';
import identityJson from '@site/_yaml-sources/snippets/production/identity.json';
import cryptoIdentityYaml from '@site/_yaml-sources/snippets/production/cryptographic-identity.yaml';
import cryptoIdentityJson from '@site/_yaml-sources/snippets/production/cryptographic-identity.json';
import permissionsYaml from '@site/_yaml-sources/snippets/production/permissions.yaml';
import permissionsJson from '@site/_yaml-sources/snippets/production/permissions.json';
import securityYaml from '@site/_yaml-sources/snippets/production/security.yaml';
import securityJson from '@site/_yaml-sources/snippets/production/security.json';
import runtimeYaml from '@site/_yaml-sources/snippets/production/runtime.yaml';
import runtimeJson from '@site/_yaml-sources/snippets/production/runtime.json';

# Production Agent Example

This example demonstrates a full production-style agent with identity, model configuration, tools, resources, prompts, permissions, security, runtime settings, and metadata.

:::info Complete Reference
This example uses all major ADL features. Use it as a reference when building production agents.
:::

## Document

<CodeTabs yaml={productionYaml} json={productionJson} title="research-assistant.adl" />

## Sections Breakdown

### Identity

The agent has a unique identifier and provider information:

<CodeTabs yaml={identityYaml} json={identityJson} />

### Cryptographic Identity

For secure agent identification:

<CodeTabs yaml={cryptoIdentityYaml} json={cryptoIdentityJson} />

### Permissions (Deny-by-Default)

:::warning Security Model
Network and filesystem access is explicitly defined. Any access not explicitly granted is **denied**.
:::

<CodeTabs yaml={permissionsYaml} json={permissionsJson} />

### Security

Authentication and encryption requirements:

<CodeTabs yaml={securityYaml} json={securityJson} />

### Runtime Configuration

How the agent should execute:

<CodeTabs yaml={runtimeYaml} json={runtimeJson} />

## Notes

:::tip Production Checklist
- Use `$schema` to enable IDE validation and autocomplete
- Define explicit permissions (deny-by-default)
- Configure security requirements (authentication, encryption)
- Set attestation with appropriate expiration dates
- Include comprehensive metadata for discovery
:::
