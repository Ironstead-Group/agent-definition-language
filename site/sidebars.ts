import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'link',
      label: 'Specification',
      href: '/spec',
    },
    {
      type: 'link',
      label: 'Profiles',
      href: '/profiles',
    },
    {
      type: 'link',
      label: 'Examples',
      href: '/spec/examples',
    },
    {
      type: 'doc',
      id: 'demo',
      label: 'Passport Discovery',
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
