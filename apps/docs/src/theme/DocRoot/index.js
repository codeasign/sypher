import React, { useEffect, useState } from 'react';
import { useLocation } from '@docusaurus/router';
import clsx from 'clsx';
import { HtmlClassNameProvider, ThemeClassNames } from '@docusaurus/theme-common';
import {
  DocsSidebarProvider,
  useDocRootMetadata,
} from '@docusaurus/plugin-content-docs/client';
import DocRootLayout from '@theme/DocRoot/Layout';
import NotFoundContent from '@theme/NotFound/Content';
import { useAuth } from '@site/src/contexts/AuthContext';
import { fetchCourseAccessRows, hasCourseAccess } from '@site/src/data/courseAccess';
import { fetchCompanyCourseAccessRows } from '@site/src/data/companyAccess';

function useAccessGuard(pathname) {
  const { user, role, companyName, loading: authLoading, supabase } = useAuth();
  const [accessRows, setAccessRows] = useState(null);
  const [companyAllowedSlugs, setCompanyAllowedSlugs] = useState(null);

  useEffect(() => {
    if (!pathname.startsWith('/docs/') || authLoading || !user) return;
    fetchCourseAccessRows(supabase).then(setAccessRows);
  }, [pathname, authLoading, user, supabase]);

  useEffect(() => {
    if (!pathname.startsWith('/docs/') || authLoading || !user) return;
    if (role !== 'company_employees') {
      setCompanyAllowedSlugs(new Set());
      return;
    }
    if (!companyName) return;
    fetchCompanyCourseAccessRows(supabase, companyName).then(setCompanyAllowedSlugs);
  }, [pathname, authLoading, user, supabase, role, companyName]);

  useEffect(() => {
    if (!pathname.startsWith('/docs/')) return;
    // Wait for the session check to resolve before deciding — otherwise a
    // logged-in user would get bounced to /login during the brief loading window.
    if (authLoading) return;

    if (!user) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
      return;
    }

    if (!accessRows || !companyAllowedSlugs) return;

    const parts = pathname.split('/').filter(Boolean);
    if (parts.length < 2) return;

    const courseSlug = parts[1];
    const accessRow = accessRows.find((r) => r.course_slug === courseSlug);
    const allowedRoles = accessRow?.allowed_roles ?? [];

    if (!hasCourseAccess(role, allowedRoles, { slug: courseSlug, companyAllowedSlugs })) {
      document.title = 'Redirecting...';
      document.body.innerHTML = '';
      window.location.replace('/');
    }
  }, [pathname, accessRows, companyAllowedSlugs, user, role, authLoading]);

  return { blocked: pathname.startsWith('/docs/') && (authLoading || !user || !accessRows || !companyAllowedSlugs) };
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
