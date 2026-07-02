import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Sypher',
  tagline: 'Learn by building',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://your-domain.example',
  baseUrl: '/',

  onBrokenLinks: 'warn',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      ({
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig: ({
    navbar: {
      title: 'Sypher',
      items: [
        // === TOPICS ===
        // Claude Code inserts new items here. Do not remove these markers.
                                { type: 'docSidebar', sidebarId: 'playwrightMastery', position: 'left', label: 'Playwright Mastery' },
                                { type: 'docSidebar', sidebarId: 'pythonForAi', position: 'left', label: 'Python for AI' },
                                { type: 'docSidebar', sidebarId: 'agenticAiFundamentals', position: 'left', label: 'Agentic AI Fundamentals' },
                                { type: 'docSidebar', sidebarId: 'systemDesignFundamentalsSidebar', position: 'left', label: 'System Design' },
        // === /TOPICS ===
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python', 'bash', 'json', 'typescript'],
    },
  }),
};

export default config;
