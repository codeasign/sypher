'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import RequireNavAccess from '@/components/RequireNavAccess';
import JobsFeed from '@/components/JobsFeed';

export default function JobsPage(): React.JSX.Element {
  return (
    <DashboardLayout title="Jobs" description="Browse open roles and apply in-app.">
      <RequireNavAccess itemKey="jobs">
        <JobsFeed />
      </RequireNavAccess>
    </DashboardLayout>
  );
}
