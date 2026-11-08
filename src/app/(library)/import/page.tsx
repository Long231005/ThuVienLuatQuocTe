'use client';

import React from 'react';
import { useLibraryData } from '@/components/library-store';
import { ImportClient } from '@/components/import-client';

export default function ImportPage() {
  const { profile, treaties, cases } = useLibraryData();

  return (
    <ImportClient
      profile={profile}
      treaties={treaties}
      cases={cases}
    />
  );
}
