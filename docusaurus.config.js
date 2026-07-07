import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Sypher',
  tagline: 'Learn by building',
  favicon: 'img/favicon.ico',

  scripts: [
    '/js/sidebar-toggle.js',
  ],
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: '/',
            from: ['/docs', '/docs/'],
          },
        ],
      },
    ],
    './plugins/access-control',
  ],

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

  customFields: {
    judge0BaseUrl: process.env.JUDGE0_BASE_URL ?? 'http://localhost:2358',
    judge0AuthToken: process.env.JUDGE0_AUTH_TOKEN ?? '',
    freeCourses: (process.env.FREE_COURSES ?? 'python-for-ai-engineers,coding-bootcamp').split(',').map(s => s.trim()),
    freeAllCourses: process.env.FREE_ALL_COURSES === 'true',
    showDurationOnLanding: process.env.SHOW_DURATION_ON_LANDING === 'true',
    showDurationOnContent: process.env.SHOW_DURATION_ON_CONTENT === 'true',
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
        { type: 'custom-exploreCourses', position: 'left' },
        // === /TOPICS ===
      ],
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python', 'bash', 'json', 'typescript'],
    },
  }),
};

export default config;
