import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebarsSpec: SidebarsConfig = {
  specSidebar: [
    {type: 'doc', id: 'specification', label: 'Specification'},
    {
      type: 'category',
      label: 'Examples',
      collapsed: false,
      link: {
        type: 'doc',
        id: 'examples/index',
      },
      items: [
        'examples/minimal',
        'examples/with-tools',
        'examples/production',
      ],
    },
  ],
};

export default sidebarsSpec;
