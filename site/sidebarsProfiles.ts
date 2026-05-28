import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebarsProfiles: SidebarsConfig = {
  profilesSidebar: [
    {
      type: 'category',
      label: 'Governance Profile',
      collapsible: false,
      collapsed: false,
      items: [
        'governance/overview',
        'governance/1.0/specification',
        'governance/1.0/governance-record',
        'governance/compatibility',
        'governance/1.0/examples',
      ],
    },
    {
      type: 'category',
      label: 'Registry Profile',
      collapsible: false,
      collapsed: false,
      items: [
        'registry/overview',
        'registry/1.0/specification',
        'registry/compatibility',
        'registry/1.0/examples',
      ],
    },
    {
      type: 'category',
      label: 'Healthcare Profile',
      collapsible: false,
      collapsed: false,
      items: [
        'healthcare/overview',
        'healthcare/1.0/specification',
        'healthcare/compatibility',
        'healthcare/1.0/examples',
      ],
    },
    {
      type: 'category',
      label: 'Financial Profile',
      collapsible: false,
      collapsed: false,
      items: [
        'financial/overview',
        'financial/1.0/specification',
        'financial/compatibility',
        'financial/1.0/examples',
      ],
    },
    {
      type: 'category',
      label: 'Portfolio Profile',
      collapsible: false,
      collapsed: false,
      items: [
        'portfolio/overview',
        'portfolio/1.0/specification',
        'portfolio/compatibility',
        'portfolio/1.0/examples',
      ],
    },
  ],
};

export default sidebarsProfiles;
