import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'doc',
      id: 'specification',
      label: 'Specification',
    },
    {
      type: 'category',
      label: 'Profiles',
      collapsed: true,
      items: [
        'profiles/index',
        {
          type: 'category',
          label: 'Governance Profile',
          collapsed: true,
          items: [
            'profiles/governance/overview',
            'profiles/governance/specification',
          ],
        },
        {
          type: 'category',
          label: 'Healthcare Profile',
          collapsed: true,
          items: [
            'profiles/healthcare/overview',
            'profiles/healthcare/specification',
          ],
        },
        {
          type: 'category',
          label: 'Financial Profile',
          collapsed: true,
          items: [
            'profiles/financial/overview',
            'profiles/financial/specification',
          ],
        },
        {
          type: 'category',
          label: 'Portfolio Profile',
          collapsed: true,
          items: [
            'profiles/portfolio/overview',
            'profiles/portfolio/specification',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      items: [
        'examples/index',
        'examples/minimal',
        'examples/with-tools',
        'examples/production',
      ],
    },
    {
      type: 'doc',
      id: 'standardization/roadmap',
      label: 'Standardization',
    },
    {
      type: 'doc',
      id: 'implementations',
      label: 'Implementations',
    },
  ],
};

export default sidebars;
