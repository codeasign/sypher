import React from 'react';
import DashboardLayout from '@site/src/components/DashboardLayout';
import ComingSoon from '@site/src/components/ComingSoon';

export default function ProfilePage(): JSX.Element {
  return (
    <DashboardLayout title="Profile" description="Your Sypher profile">
      <ComingSoon
        title="Profile"
        description="Manage your account details and preferences. This feature is on its way."
      />
    </DashboardLayout>
  );
}
