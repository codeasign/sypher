require('dotenv').config({ override: true });

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
    './plugins/course-sections',
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
    showDurationOnLanding: process.env.SHOW_DURATION_ON_LANDING === 'true',
    showDurationOnContent: process.env.SHOW_DURATION_ON_CONTENT === 'true',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    web3formsAccessKey: process.env.WEB3FORMS_ACCESS_KEY ?? '',
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
        { to: '/corporate-training', label: 'Corporate Training', position: 'left' },
        { to: '/resume-review', label: 'Resume Review', position: 'left' },
        { to: '/mock-interview', label: 'Mock Interview', position: 'left' },
        { type: 'custom-login', position: 'right' },
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
      additionalLanguages: ['python', 'bash', 'json', 'typescript', 'c', 'cpp', 'java', 'csharp', 'javascript', 'rust', 'go'],
    },
  }),
};

export default config;
