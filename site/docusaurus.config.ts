import path from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import {
  remarkProfileBadge,
  remarkBlockquoteAdmonitions,
  remarkRewriteLinks,
  remarkStripSections,
  remarkStripTitle,
  remarkVersionBadge,
  remarkWrapExample,
  remarkWrapValidation,
} from './src/remark';
import schemaCopyPlugin from './src/plugins/schema-copy';
import {bridgeSpecVersions} from './src/plugins/spec-version-bridge';

// Bridge released versions from versions/{id}/ → spec_versioned_docs/
// Must run before Docusaurus initializes the spec docs plugin.
bridgeSpecVersions(__dirname);

const config: Config = {
  title: 'Agent Definition Language',
  tagline: 'The standard for trusted AI agents',
  favicon: 'img/favicon.ico',

  clientModules: [
    './src/clientModules/gtagSafeGuard.ts',
    './src/clientModules/disableCrossTabThemeSync.ts',
  ],

  future: {
    v4: true,
  },

  url: 'https://adl-spec.org',
  baseUrl: '/',

  organizationName: 'ironstead-group',
  projectName: 'agent-definition-language',

  onBrokenLinks: 'throw',

  markdown: {
    format: 'detect',
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
            resolve: {
              symlinks: false,
              alias: {
                '@versions': path.resolve(__dirname, '..', 'versions'),
              },
            },
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
    schemaCopyPlugin,
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'spec',
        path: '../versions/draft',
        routeBasePath: '/spec',
        sidebarPath: './sidebarsSpec.ts',
        include: ['spec.md', 'examples/**/*.{md,mdx}'],
        exclude: ['**/CONVENTIONS.md', '**/snippets/**', '**/README.md'],
        beforeDefaultRemarkPlugins: [
          remarkBlockquoteAdmonitions,
          remarkStripTitle,
        ],
        remarkPlugins: [
          remarkVersionBadge,
          remarkRewriteLinks,
        ],
        lastVersion: '0.1.0',
        versions: {
          current: {
            label: '0.2.0 (Draft)',
            path: 'next',
            banner: 'unreleased',
          },
          '0.1.0': {
            label: '0.1.0',
            banner: 'none',
          },
        },
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'profiles',
        path: '../profiles',
        routeBasePath: '/profiles',
        sidebarPath: './sidebarsProfiles.ts',
        include: ['README.md', '*/README.md', '*/COMPATIBILITY.md', '*/*/profile.md', '*/*/governance-record.md', '*/*/examples.mdx'],
        exclude: [
          '**/node_modules/**',
        ],
        beforeDefaultRemarkPlugins: [
          remarkBlockquoteAdmonitions,
          remarkStripSections,
          remarkRewriteLinks,
        ],
        remarkPlugins: [
          remarkProfileBadge,
          remarkWrapExample,
          remarkWrapValidation,
        ],
      },
    ],
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
        siteDescription: 'The standard for trusted AI agents. ADL provides a standardized way to define agent identity, permissions, lifecycle, compliance, and governance in one auditable document.',
        depth: 2,
        enableDescriptions: true,
        includeOrder: ['/spec/**', '/spec/examples/**', '/profiles/**', '/standardization/**'],
      },
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: ['/', '/spec', '/profiles'],
      },
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
          beforeDefaultRemarkPlugins: [
            remarkBlockquoteAdmonitions,
            remarkStripTitle,
          ],
          remarkPlugins: [
            remarkVersionBadge,
            remarkRewriteLinks,
          ],
          // Versioning: run `npm run docusaurus docs:version X.Y.Z` when releasing
        },
        gtag: {
          trackingID: 'G-42E68RY568',
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
    {
      tagName: 'meta',
      attributes: {
        property: 'og:site_name',
        content: 'Agent Definition Language (ADL)',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:locale',
        content: 'en_US',
      },
    },
    // Structured data for search engines
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Agent Definition Language (ADL)',
        url: 'https://adl-spec.org',
        description: 'The open standard for defining AI agent identity, permissions, lifecycle, and compliance in one auditable, machine-readable document.',
        publisher: {
          '@type': 'Organization',
          name: 'ADL Specification Authors',
          url: 'https://adl-spec.org',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://adl-spec.org/?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      }),
    },
  ],

  themeConfig: {
    image: 'img/adl-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    metadata: [
      {name: 'description', content: 'Agent Definition Language (ADL) — the open standard for defining AI agent identity, permissions, lifecycle, and compliance in one auditable, machine-readable document.'},
      {name: 'theme-color', content: '#0369a1'},
      {name: 'apple-mobile-web-app-capable', content: 'yes'},
      {name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent'},
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'twitter:title', content: 'Agent Definition Language (ADL)'},
      {name: 'twitter:description', content: 'The open standard for defining AI agent identity, permissions, lifecycle, and compliance.'},
    ],
    navbar: {
      title: 'Agent Definition Language',
      logo: {
        alt: 'ADL Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docsVersionDropdown',
          docsPluginId: 'spec',
          position: 'left',
        },
        {
          type: 'search',
          position: 'right',
        },
        {
          type: 'custom-github-repo' as any,
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
              label: 'ADL Specification',
              to: '/spec',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/adl-spec/agent-definition-language',
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
              to: '/spec/examples',
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
      copyright: `Copyright ${new Date().getFullYear()} ADL Specification Authors. Sponsored by <a href="https://ironsteadgroup.com" target="_blank" rel="noopener noreferrer">Ironstead Group, LLC</a>. Patent Pending. Licensed under Apache 2.0.`,
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
