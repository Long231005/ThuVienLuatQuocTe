'use client';

import React from 'react';
import { useLibraryData } from '@/components/library-store';
import { DashboardClient } from '@/components/dashboard-client';

export default function HomePage() {
  const { profile, treaties, cases, errorMessage } = useLibraryData();

  return (
    <DashboardClient
      profile={profile}
      treaties={treaties}
      cases={cases}
      errorMessage={errorMessage}
    />
  );
}
