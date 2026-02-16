---
id: permissions
title: 9. Permissions
sidebar_position: 9
description: Define agent operational boundaries with deny-by-default permissions for network, filesystem, environment, and execution.
keywords: [adl, permissions, security, deny-by-default, network, filesystem]
---

import CodeTabs from '@site/src/components/CodeTabs';
import networkYaml from '@site/_yaml-sources/snippets/permissions/network.yaml';
import networkJson from '@site/_yaml-sources/snippets/permissions/network.json';
import filesystemYaml from '@site/_yaml-sources/snippets/permissions/filesystem.yaml';
import filesystemJson from '@site/_yaml-sources/snippets/permissions/filesystem.json';
import resourceLimitsYaml from '@site/_yaml-sources/snippets/permissions/resource-limits.yaml';
import resourceLimitsJson from '@site/_yaml-sources/snippets/permissions/resource-limits.json';

# Permissions

The `permissions` member defines the agent's operational boundaries. **OPTIONAL.** When present, value **MUST** be an object containing one or more permission domain members.

:::warning Deny-by-Default
Permissions operate on a **deny-by-default** model: capabilities not explicitly granted are **denied**. Runtimes **SHOULD** enforce declared permissions. Runtimes that cannot enforce a permission domain **SHOULD** warn users before execution.
:::

| Domain          | Description                    |
|-----------------|--------------------------------|
| network         | Network access boundaries      |
| filesystem      | Filesystem access boundaries   |
| environment     | Environment variable access    |
| execution       | Process execution boundaries   |
| resource_limits | Resource consumption limits   |

## 9.2 network

May contain: `allowed_hosts` (array of host patterns), `allowed_ports`, `allowed_protocols`, `deny_private` (bool). Host patterns support exact match and `*.example.com`.

<CodeTabs yaml={networkYaml} json={networkJson} />

## 9.3 filesystem

May contain: `allowed_paths` (array of `{ path, access }` where access is `read`, `write`, or `read_write`), `denied_paths`.

<CodeTabs yaml={filesystemYaml} json={filesystemJson} />

## 9.4 environment

May contain: `allowed_variables`, `denied_variables` (patterns with wildcards, e.g., `APP_*`).

## 9.5 execution

May contain: `allowed_commands`, `denied_commands`, `allow_shell` (bool).

## 9.6 resource_limits

May contain: `max_memory_mb`, `max_cpu_percent`, `max_duration_sec`, `max_concurrent`.

<CodeTabs yaml={resourceLimitsYaml} json={resourceLimitsJson} />
