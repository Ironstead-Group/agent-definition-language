---
id: metadata
title: 12. Metadata
sidebar_position: 12
description: Add metadata for discovery, licensing, documentation, and organizational information.
keywords: [adl, metadata, license, authors, tags, discovery]
---

import CodeTabs from '@site/src/components/CodeTabs';
import authorsYaml from '@site/_yaml-sources/snippets/metadata/authors.yaml';
import authorsJson from '@site/_yaml-sources/snippets/metadata/authors.json';
import licenseYaml from '@site/_yaml-sources/snippets/metadata/license.yaml';
import licenseJson from '@site/_yaml-sources/snippets/metadata/license.json';
import documentationYaml from '@site/_yaml-sources/snippets/metadata/documentation.yaml';
import documentationJson from '@site/_yaml-sources/snippets/metadata/documentation.json';
import repositoryYaml from '@site/_yaml-sources/snippets/metadata/repository.yaml';
import repositoryJson from '@site/_yaml-sources/snippets/metadata/repository.json';
import tagsYaml from '@site/_yaml-sources/snippets/metadata/tags.yaml';
import tagsJson from '@site/_yaml-sources/snippets/metadata/tags.json';

# Metadata

The `metadata` member provides additional information for discovery, attribution, and licensing. **OPTIONAL.** When present, value **MUST** be an object.

:::tip Discovery and Attribution
Well-defined metadata improves agent discoverability in registries and provides clear attribution and licensing information.
:::

## 12.1 authors

Array of author objects. Each **MAY** contain `name`, `email`, `url`.

<CodeTabs yaml={authorsYaml} json={authorsJson} />

## 12.2 license

String: SPDX license identifier or URI to license document.

<CodeTabs yaml={licenseYaml} json={licenseJson} />

## 12.3 documentation

String: URI to documentation.

<CodeTabs yaml={documentationYaml} json={documentationJson} />

## 12.4 repository

String: URI to source repository.

<CodeTabs yaml={repositoryYaml} json={repositoryJson} />

## 12.5 tags

Array of strings. **SHOULD** be lowercase, alphanumeric and hyphens only.

<CodeTabs yaml={tagsYaml} json={tagsJson} />
