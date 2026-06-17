import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'TubeZero',
  tagline: 'Zero-dependency YouTube InnerTube client',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // GitHub Pages deploy config
  url: 'https://7Mik.github.io',
  baseUrl: '/TubeZero/',
  organizationName: '7Mik',
  projectName: 'TubeZero',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // Serve the docs at the site's root
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/7Mik/TubeZero/tree/main/docs/',
        },
        blog: false, // Disable the blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'TubeZero',
      logo: {
        alt: 'TubeZero Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          href: 'https://github.com/7Mik/TubeZero',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/tubezero',
          label: 'NPM',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Quick Start',
              to: '/',
            },
            {
              label: 'Snippets & FAQ',
              to: '/snippets-faq',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/7Mik/TubeZero',
            },
            {
              label: 'NPM',
              href: 'https://www.npmjs.com/package/tubezero',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} TubeZero. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
