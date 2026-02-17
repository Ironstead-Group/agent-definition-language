import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useNavbarSecondaryMenu} from '@docusaurus/theme-common/internal';
import {ThemeClassNames} from '@docusaurus/theme-common';
import SearchBar from '@theme/SearchBar';
import NavbarColorModeToggle from '@theme/Navbar/ColorModeToggle';
import GitHubRepoWidget from '@site/src/components/GitHubRepoWidget';

function FallbackNav() {
  return (
    <ul className="menu__list">
      <li className="menu__list-item">
        <Link className="menu__link" to="/specification">
          Specification v0.1.0
        </Link>
      </li>
      <li className="menu__list-item">
        <Link className="menu__link" to="/profiles">
          Profiles
        </Link>
      </li>
      <li className="menu__list-item">
        <Link className="menu__link" to="/examples">
          Examples
        </Link>
      </li>
      <li className="menu__list-item">
        <Link className="menu__link" to="/standardization/roadmap">
          Standardization
        </Link>
      </li>
    </ul>
  );
}

export default function NavbarMobileSidebarLayout({
  header,
  primaryMenu,
  secondaryMenu,
}: {
  header: React.ReactNode;
  primaryMenu: React.ReactNode;
  secondaryMenu: React.ReactNode;
}) {
  const secondaryMenuState = useNavbarSecondaryMenu();

  return (
    <div
      className={clsx(
        ThemeClassNames.layout.navbar.mobileSidebar.container,
        'navbar-sidebar',
      )}
      style={{display: 'flex', flexDirection: 'column'}}>
      {header}
      <div className="navbar-sidebar__search">
        <SearchBar />
      </div>
      <div className="navbar-sidebar__nav">
        {secondaryMenuState.content ?? <FallbackNav />}
      </div>
      <div className="navbar-sidebar__footer">
        <GitHubRepoWidget compact />
        <NavbarColorModeToggle />
      </div>
    </div>
  );
}
