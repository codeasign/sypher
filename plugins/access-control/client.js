import { useLocation } from '@docusaurus/router';
import { usePluginData } from '@docusaurus/useGlobalData';
import { useLayoutEffect, useState } from 'react';

/**
 * Fetch the runtime access control config from /access-control.json.
 * Cached after first load so subsequent calls resolve instantly.
 */
let cachedConfig = null;
let configPromise = null;

function fetchConfig() {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (configPromise) return configPromise;
  configPromise = fetch('/access-control.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch access-control.json');
      return res.json();
    })
    .then((data) => {
      cachedConfig = data;
      return data;
    })
    .catch(() => {
      // Fallback if file doesn't exist (e.g. first build before plugin runs)
      cachedConfig = { freeCourses: [], freeSections: 3 };
      return cachedConfig;
    });
  return configPromise;
}

/**
 * Immediately block page rendering and redirect to home.
 */
function blockAndRedirect() {
  if (document.title !== 'Redirecting...') {
    document.title = 'Redirecting...';
    document.body.innerHTML = '';
    window.location.replace('/');
  }
}

/**
 * Determine the section index for a given doc path.
 */
function getSectionIndex(docPath, courseSectionMap) {
  const parts = docPath.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'docs') return -1;

  const courseSlug = parts[1];
  const courseMap = courseSectionMap[courseSlug];
  if (!courseMap) return -1;

  const docId = parts.slice(1).join('/');
  if (courseMap[docId] !== undefined) return courseMap[docId];

  const partialId = parts.slice(1, 3).join('/');
  if (courseMap[partialId] !== undefined) return courseMap[partialId];

  return -1;
}

/**
 * Guard all /docs/ routes — blocks and redirects for restricted content.
 * Uses runtime config from /access-control.json.
 */
function AccessGuard() {
  const location = useLocation();
  const data = usePluginData('access-control');
  const courseSectionMap = data?.courseSectionMap ?? {};
  const [config, setConfig] = useState(null);

  useLayoutEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

  useLayoutEffect(() => {
    if (!config) return;

    const path = location.pathname;
    const freeCourses = config.freeCourses ?? [];

    // Block /docs and /docs/
    if (path === '/docs' || path === '/docs/') {
      blockAndRedirect();
      return;
    }

    if (!path.startsWith('/docs/')) return;

    const parts = path.split('/').filter(Boolean);
    if (parts.length < 2) {
      blockAndRedirect();
      return;
    }

    const courseSlug = parts[1];

    // Free courses are fully accessible
    if (freeCourses.includes(courseSlug)) return;

    // Paid courses: first N sections free
    const freeSections = config.freeSections ?? 3;
    const sectionIndex = getSectionIndex(path, courseSectionMap);
    if (sectionIndex === -1) {
      blockAndRedirect();
      return;
    }

    if (sectionIndex < freeSections) return;

    // Restricted — block and redirect
    blockAndRedirect();
  }, [location.pathname, config]);

  return null;
}

export default AccessGuard;