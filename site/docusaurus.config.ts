import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type {PluginOptions as LlmsPluginOptions} from '@signalwire/docusaurus-plugin-llms-txt/public';

const config: Config = {
  title: 'Agent Definition Language',
  tagline: 'A vendor-neutral specification for describing AI agents',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://adl-spec.org',
  baseUrl: '/',

  organizationName: 'adl-spec',
  projectName: 'agent-definition-language',

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    function yamlLoaderPlugin() {
      return {
        name: 'yaml-loader',
        configureWebpack() {
          return {
            module: {
              rules: [
                {
                  test: /\.yaml$/,
                  type: 'asset/source',
                },
              ],
            },
          };
        },
      };
    },
    [
      '@signalwire/docusaurus-plugin-llms-txt',
      {
        content: {
          enableMarkdownFiles: true,
          enableLlmsFullTxt: true,
          relativePaths: true,
          includeDocs: true,
          includeVersionedDocs: false,
          includeBlog: false,
          includePages: false,
        },
        siteTitle: 'Agent Definition Language (ADL)',
        siteDescription: 'A vendor-neutral specification for describing AI agents. ADL provides a standardized way to define agent capabilities, permissions, security requirements, and runtime behavior.',
        depth: 2,
        enableDescriptions: true,
        includeOrder: ['/spec/**', '/examples/**', '/profiles/**', '/standardization/**'],
      } satisfies LlmsPluginOptions,
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/adl-spec/agent-definition-language/tree/main/',
          routeBasePath: '/',
          // Versioning: run `npm run docusaurus docs:version X.Y.Z` when releasing
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  headTags: [
    // LLM-friendly content discovery
    {
      tagName: 'link',
      attributes: {
        rel: 'alternate',
        type: 'text/plain',
        title: 'LLM-friendly content',
        href: '/llms.txt',
      },
    },
    // Preconnect to Google Fonts for faster loading
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    // Open Graph metadata
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
  ],

  themeConfig: {
    image: 'img/adl-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    metadata: [
      {name: 'theme-color', content: '#0369a1'},
      {name: 'apple-mobile-web-app-capable', content: 'yes'},
      {name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent'},
    ],
    navbar: {
      title: 'ADL',
      logo: {
        alt: 'ADL Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'specSidebar',
          position: 'left',
          label: 'Specification',
        },
        {
          type: 'docSidebar',
          sidebarId: 'profilesSidebar',
          position: 'left',
          label: 'Profiles',
        },
        {
          type: 'docSidebar',
          sidebarId: 'examplesSidebar',
          position: 'left',
          label: 'Examples',
        },
        {
          type: 'docSidebar',
          sidebarId: 'standardizationSidebar',
          position: 'left',
          label: 'Standardization',
        },
        {
          href: 'https://github.com/adl-spec/agent-definition-language',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Specification',
          items: [
            {
              label: 'ADL 0.1.0 (Draft)',
              to: '/spec/introduction',
            },
            {
              label: 'JSON Schema',
              to: '/spec/appendix-schema',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Profiles',
              to: '/profiles',
            },
            {
              label: 'Examples',
              to: '/examples',
            },
            {
              label: 'Implementations',
              to: '/implementations',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Contributing',
              to: '/contributing',
            },
            {
              label: 'Governance',
              to: '/governance',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/adl-spec/agent-definition-language',
            },
            {
              label: 'LLMs.txt',
              href: 'pathname:///llms.txt',
            },
          ],
        },
        {
          title: 'Standardization',
          items: [
            {
              label: 'Roadmap',
              to: '/standardization/roadmap',
            },
            {
              label: 'Get Involved',
              href: 'https://github.com/adl-spec/agent-definition-language',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} ADL Specification Authors. Sponsored by Ironstead Group, LLC. Licensed under Apache 2.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['json', 'yaml', 'bash', 'typescript', 'python'],
      magicComments: [
        {
          className: 'theme-code-block-highlighted-line',
          line: 'highlight-next-line',
          block: {start: 'highlight-start', end: 'highlight-end'},
        },
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
