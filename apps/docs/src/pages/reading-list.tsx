import React from 'react';
import DashboardLayout from '@site/src/components/DashboardLayout';
import ComingSoon from '@site/src/components/ComingSoon';

export default function ReadingListPage(): JSX.Element {
  return (
    <DashboardLayout title="Reading List" description="Your Sypher reading list">
      <ComingSoon
        title="Reading List"
        description="Track lessons you plan to read next. This feature is on its way."
      />
    </DashboardLayout>
  );
}
