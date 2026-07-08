import React, { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import { usePluginData } from '@docusaurus/useGlobalData';
import clsx from 'clsx';
import { HtmlClassNameProvider, ThemeClassNames } from '@docusaurus/theme-common';
import {
  DocsSidebarProvider,
  useDocRootMetadata,
} from '@docusaurus/plugin-content-docs/client';
import DocRootLayout from '@theme/DocRoot/Layout';
import NotFoundContent from '@theme/NotFound/Content';
import { useAuth } from '@site/src/contexts/AuthContext';

/**
 * Fetch runtime access control config, cached after first load.
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
      cachedConfig = { freeCourses: [], freeSections: 3 };
      return cachedConfig;
    });
  return configPromise;
}

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

function useAccessGuard(pathname) {
  const data = usePluginData('access-control');
  const courseSectionMap = data?.courseSectionMap ?? {};
  const [config, setConfig] = useState(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (!pathname.startsWith('/docs/')) return;
    // Wait for the session check to resolve before deciding — otherwise a
    // logged-in user would get bounced to /login during the brief loading window.
    if (authLoading) return;

    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
      return;
    }

    if (!config) return;

    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 2) return;

    const courseSlug = parts[1];
    const freeCourses = config.freeCourses ?? [];

    if (freeCourses.includes(courseSlug)) return;

    const freeSections = config.freeSections ?? 3;
    const sectionIndex = getSectionIndex(pathname, courseSectionMap);
    if (sectionIndex === -1 || sectionIndex >= freeSections) {
      document.title = 'Redirecting...';
      document.body.innerHTML = '';
      window.location.replace('/');
    }
  }, [pathname, config, user, authLoading]);

  return { blocked: pathname.startsWith('/docs/') && (authLoading || !user) };
}

export default function DocRoot(props) {
  const location = useLocation();
  const { blocked } = useAccessGuard(location.pathname);

  const currentDocRouteMetadata = useDocRootMetadata(props);
  if (!currentDocRouteMetadata) {
    return <NotFoundContent />;
  }

  if (blocked) {
    return <p role="status">Checking your session…</p>;
  }

  const { docElement, sidebarName, sidebarItems } = currentDocRouteMetadata;
  return (
    <HtmlClassNameProvider className={clsx(ThemeClassNames.page.docsDocPage)}>
      <DocsSidebarProvider name={sidebarName} items={sidebarItems}>
        <DocRootLayout>{docElement}</DocRootLayout>
      </DocsSidebarProvider>
    </HtmlClassNameProvider>
  );
}