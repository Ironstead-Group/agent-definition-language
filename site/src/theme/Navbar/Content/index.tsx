import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {useThemeConfig, ErrorCauseBoundary} from '@docusaurus/theme-common';
import {
  splitNavbarItems,
  useNavbarMobileSidebar,
} from '@docusaurus/theme-common/internal';
import NavbarItem, {type Props as NavbarItemConfig} from '@theme/NavbarItem';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import SearchBar from '@theme/SearchBar';
import NavbarMobileSidebarToggle from '@theme/Navbar/MobileSidebar/Toggle';
import NavbarLogo from '@theme/Navbar/Logo';
import NavbarSearch from '@theme/Navbar/Search';
import {useActivePlugin} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './styles.module.css';

function HomeIcon(): ReactNode {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true">
      <path d="M11.03 2.59a1.5 1.5 0 0 1 1.94 0l7.5 6.36A1.5 1.5 0 0 1 21 10.09V20a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1-.5-.5v-5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5v5a.5.5 0 0 1-.5.5h-4A1.5 1.5 0 0 1 3 20v-9.91c0-.44.2-.86.53-1.14l7.5-6.36Z" />
    </svg>
  );
}

function useNavbarItems() {
  // TODO temporary casting until ThemeConfig type is improved
  return useThemeConfig().navbar.items as NavbarItemConfig[];
}

function NavbarItems({items}: {items: NavbarItemConfig[]}): ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <ErrorCauseBoundary
          key={i}
          onError={(error) =>
            new Error(
              `A theme navbar item failed to render.
Please double-check the following navbar item (themeConfig.navbar.items) of your Docusaurus config:
${JSON.stringify(item, null, 2)}`,
              {cause: error},
            )
          }>
          <NavbarItem {...item} />
        </ErrorCauseBoundary>
      ))}
    </>
  );
}

/**
 * Two-row navbar:
 *  - Primary row: logo + title, the contextual version dropdown, and utilities
 *    (search, GitHub, color-mode). The version dropdown renders only on pages
 *    that belong to a versioned docs plugin, so it disappears elsewhere.
 *  - Secondary row: the section navigation links.
 */
export default function NavbarContent(): ReactNode {
  const mobileSidebar = useNavbarMobileSidebar();

  const items = useNavbarItems();
  const [leftItems, rightItems] = splitNavbarItems(items);

  const searchBarItem = items.find((item) => item.type === 'search');

  const sectionItems = leftItems.filter(
    (item) => item.type !== 'docsVersionDropdown',
  );

  // The version dropdown is contextual: it appears only when the page belongs
  // to a docs plugin that actually has multiple versions. `docsVersionDropdown`
  // navbar items render on every page by default, so we gate them here.
  const activePlugin = useActivePlugin();
  const pageHasVersions =
    (activePlugin?.pluginData?.versions?.length ?? 0) > 1;

  const {pathname} = useLocation();
  const homeHref = useBaseUrl('/');
  const isHome = pathname === homeHref;
  const versionItems = pageHasVersions
    ? leftItems.filter(
        (item) =>
          item.type === 'docsVersionDropdown' &&
          (item as {docsPluginId?: string}).docsPluginId ===
            activePlugin?.pluginId,
      )
    : [];

  return (
    <div className={styles.navbarContent}>
      <div className={clsx('navbar__inner', styles.primaryRow)}>
        <div className="navbar__items">
          {!mobileSidebar.disabled && <NavbarMobileSidebarToggle />}
          <NavbarLogo />
          {versionItems.length > 0 && (
            <div className={styles.versionSlot}>
              <NavbarItems items={versionItems} />
            </div>
          )}
        </div>
        <div className="navbar__items navbar__items--right">
          <NavbarItems items={rightItems} />
          <NavbarColorModeToggle className={styles.colorModeToggle} />
          {!searchBarItem && (
            <NavbarSearch>
              <SearchBar />
            </NavbarSearch>
          )}
        </div>
      </div>

      {sectionItems.length > 0 && (
        <div className={clsx('navbar__inner', styles.secondaryRow)}>
          <div className="navbar__items">
            {!isHome && (
              <Link
                to="/"
                className={clsx('navbar__link', styles.homeLink)}
                aria-label="Home">
                <HomeIcon />
              </Link>
            )}
            <NavbarItems items={sectionItems} />
          </div>
        </div>
      )}
    </div>
  );
}
