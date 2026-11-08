import React from 'react';
import { fetchLibraryData } from '@/lib/data';
import { AppShell } from '@/components/app-shell';
import { LibraryDataProvider } from '@/components/library-store';

export const dynamic = 'force-dynamic';

export default async function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, treaties, cases, errorMessage } = await fetchLibraryData();

  return (
    <AppShell profile={profile}>
      <LibraryDataProvider
        value={{ profile, treaties, cases, errorMessage }}
      >
        {children}
      </LibraryDataProvider>
    </AppShell>
  );
}
