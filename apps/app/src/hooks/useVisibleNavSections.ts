'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNavAccessRows, canSeeNavItem } from '@/data/navAccess';
import { fetchCompanyNavAccessRows } from '@/data/companyAccess';
import { NAV_SECTIONS } from '@/data/navItems';

export interface VisibleNavItem {
  key?: string;
  href: string;
  label: string;
  comingSoon?: boolean;
}

export interface VisibleNavSection {
  title: string;
  items: VisibleNavItem[];
}

interface UseVisibleNavSectionsResult {
  sections: VisibleNavSection[];
  loading: boolean;
}

// Same role/company gating DashboardSidebar uses to decide what to show in
// the nav -- shared so anywhere else that wants to say "does this user
// actually have access to X" (e.g. the dashboard's quick links) stays in
// sync with the sidebar instead of drifting out of consistency with it.
export function useVisibleNavSections(): UseVisibleNavSectionsResult {
  const { supabase, role, companyName } = useAuth();
  const [navAccessLoading, setNavAccessLoading] = useState(true);
  const [allowedRolesByKey, setAllowedRolesByKey] = useState<Record<string, string[]>>({});
  const [companyAllowedItemKeys, setCompanyAllowedItemKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (role === 'admin') {
      setNavAccessLoading(false);
      return;
    }
    let isMounted = true;
    fetchNavAccessRows(supabase).then((rows: { item_key: string; allowed_roles: string[] }[]) => {
      if (!isMounted) return;
      const map: Record<string, string[]> = {};
      for (const row of rows) {
        map[row.item_key] = row.allowed_roles ?? [];
      }
      setAllowedRolesByKey(map);
      setNavAccessLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [supabase, role]);

  useEffect(() => {
    if (role !== 'company_employees' || !companyName) return;
    fetchCompanyNavAccessRows(supabase, companyName).then(setCompanyAllowedItemKeys);
  }, [supabase, role, companyName]);

  const loading = role !== 'admin' && navAccessLoading;

  const sections: VisibleNavSection[] =
    role === 'admin'
      ? NAV_SECTIONS
      : loading
      ? []
      : NAV_SECTIONS.map((section) => ({
          title: section.title,
          items: section.items.filter((item) =>
            canSeeNavItem(role, item.key ? allowedRolesByKey[item.key] : [], {
              itemKey: item.key,
              companyAllowedItemKeys,
            }),
          ),
        })).filter((section) => section.items.length > 0);

  return { sections, loading };
}
