import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebarsProfiles: SidebarsConfig = {
  profilesSidebar: [
    {
      type: 'link',
      label: 'Specification',
      href: '/spec',
    },
    {
      type: 'category',
      label: 'Profiles',
      collapsed: false,
      link: {
        type: 'doc',
        id: 'index',
      },
      items: [
        {
          type: 'category',
          label: 'Governance Profile',
          collapsed: true,
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
          collapsed: true,
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
          collapsed: true,
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
          collapsed: true,
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
          collapsed: true,
          items: [
            'portfolio/overview',
            'portfolio/1.0/specification',
            'portfolio/compatibility',
            'portfolio/1.0/examples',
          ],
        },
      ],
    },
    {
      type: 'link',
      label: 'Examples',
      href: '/spec/examples',
    },
    {
      type: 'link',
      label: 'Standardization',
      href: '/standardization/roadmap',
    },
    {
      type: 'link',
      label: 'Implementations',
      href: '/implementations',
    },
  ],
};

export default sidebarsProfiles;
