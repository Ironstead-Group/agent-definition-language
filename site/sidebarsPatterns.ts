import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebarsPatterns: SidebarsConfig = {
  patternsSidebar: [
    {type: 'doc', id: 'index', label: 'Overview'},
    'multi-hop-authorization',
    'exposing-agents',
    'inbound-verification',
    'ai-gateway',
  ],
};

export default sidebarsPatterns;
