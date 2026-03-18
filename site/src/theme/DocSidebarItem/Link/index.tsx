import React, {type ReactNode} from 'react';
import Link from '@theme-original/DocSidebarItem/Link';
import type LinkType from '@theme/DocSidebarItem/Link';
import type {WrapperProps} from '@docusaurus/types';
import {useDocsPreferredVersion} from '@docusaurus/plugin-content-docs/client';

type Props = WrapperProps<typeof LinkType>;

/**
 * Wraps sidebar link items so that cross-plugin hrefs to /spec/...
 * respect the user's preferred spec version (e.g. /spec/next/...).
 */
export default function LinkWrapper(props: Props): ReactNode {
  const href = props.item?.href;
  if (typeof href === 'string' && href.startsWith('/spec')) {
    return <VersionAwareLink {...props} />;
  }
  return <Link {...props} />;
}

function VersionAwareLink(props: Props): ReactNode {
  const {preferredVersion} = useDocsPreferredVersion('spec');
  const href = props.item.href as string;

  // Rewrite only un-versioned /spec hrefs (from cross-plugin sidebar links).
  // Skip if the href already starts with the preferred version path to avoid
  // double-rewriting (DocSidebarItem/Doc delegates here with resolved hrefs).
  if (
    preferredVersion?.path &&
    preferredVersion.path !== '/spec' &&
    !href.startsWith(preferredVersion.path)
  ) {
    const versionedHref = href.replace(/^\/spec/, preferredVersion.path);
    const patchedItem = {...props.item, href: versionedHref};
    return <Link {...props} item={patchedItem} />;
  }

  return <Link {...props} />;
}
