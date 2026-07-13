// apps/app has no light/dark theme system yet — this is a static stand-in
// for Docusaurus's @docusaurus/theme-common useColorMode so the moved
// blog-preview components keep compiling without inventing a theme system.
export function useColorMode(): { colorMode: 'light' | 'dark' } {
  return { colorMode: 'light' };
}
