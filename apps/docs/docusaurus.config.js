require('dotenv').config({ override: true });

import {themes as prismThemes} from 'prism-react-renderer';
import { getAppOrigin } from '@sypher/auth-core/src/urls';

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID ?? '';

// Renders straight into the generated HTML <head>, ahead of Docusaurus's own
// bundle, so consent defaults to 'denied' (unless the visitor already chose
// on app.sypher.local -- same cookie, read here via a literal regex since
// this has to be plain JS text, not an import; name must stay in sync with
// CONSENT_COOKIE_NAME in @sypher/auth-core/src/analyticsConsent.js) before
// gtag.js is even requested. The cookie value is JSON ({analytics,
// marketing} -- see analyticsConsent.js); a pre-categories cookie (bare
// 'granted'/'denied' string) fails JSON.parse and falls through to
// denied-by-default, same as no cookie at all. wait_for_update gives
// CookieConsentBanner half a second to call gtag('consent','update',...)
// once React hydrates.
const GA_HEAD_TAGS = GA_MEASUREMENT_ID
  ? [
      {
        tagName: 'script',
        attributes: {},
        innerHTML: `
(function() {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var analyticsGranted = false;
  var marketingGranted = false;
  try {
    var match = document.cookie.match(/(?:^|; )sypher-analytics-consent=([^;]*)/);
    if (match) {
      var parsed = JSON.parse(decodeURIComponent(match[1]));
      analyticsGranted = parsed.analytics === 'granted';
      marketingGranted = parsed.marketing === 'granted';
    }
  } catch (e) {}

  gtag('consent', 'default', {
    analytics_storage: analyticsGranted ? 'granted' : 'denied',
    ad_storage: marketingGranted ? 'granted' : 'denied',
    ad_user_data: marketingGranted ? 'granted' : 'denied',
    ad_personalization: marketingGranted ? 'granted' : 'denied',
    wait_for_update: 500,
  });
})();
`,
      },
      {
        tagName: 'script',
        attributes: { src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`, async: true },
      },
      {
        tagName: 'script',
        attributes: {},
        innerHTML: `window.gtag('js', new Date()); window.gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });`,
      },
    ]
  : [];

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Sypher',
  tagline: 'Learn by building',
  favicon: 'img/favicon.ico',

  headTags: GA_HEAD_TAGS,

  scripts: [
    '/js/sidebar-toggle.js',
  ],
  plugins: [
    './plugins/course-sections',
    './plugins/blog-routes',
    './plugins/course-chunk-isolation',
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
    gaMeasurementId: GA_MEASUREMENT_ID,
    judge0BaseUrl: process.env.JUDGE0_BASE_URL ?? 'http://localhost:2358',
    judge0AuthToken: process.env.JUDGE0_AUTH_TOKEN ?? '',
    showDurationOnLanding: process.env.SHOW_DURATION_ON_LANDING === 'true',
    showDurationOnContent: process.env.SHOW_DURATION_ON_CONTENT === 'true',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    web3formsAccessKey: process.env.WEB3FORMS_ACCESS_KEY ?? '',
    bunnyStorageZone: process.env.BUNNY_STORAGE_ZONE ?? '',
    bunnyStorageAccessKey: process.env.BUNNY_STORAGE_ACCESS_KEY ?? '',
    bunnyStorageHostname: process.env.BUNNY_STORAGE_HOSTNAME ?? 'storage.bunnycdn.com',
    bunnyPullZoneUrl: process.env.BUNNY_PULL_ZONE_URL ?? '',
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
    apiBaseUrl: process.env.API_BASE_URL ?? '',
    paidUpgradePriceInrPaise: process.env.PAID_UPGRADE_PRICE_INR_PAISE ?? '',
    paidUpgradeDurationDays: process.env.PAID_UPGRADE_DURATION_DAYS ?? '365',
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
        { to: '/blog', label: 'Blog', position: 'left' },
        { href: `${getAppOrigin()}/careers`, label: 'Careers', position: 'left' },
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
