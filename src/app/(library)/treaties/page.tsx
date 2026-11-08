'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLibraryData } from '@/components/library-store';
import { TreatiesClient } from '@/components/treaties-client';

function TreatiesPageInner() {
  const searchParams = useSearchParams();
  const { profile, treaties, errorMessage } = useLibraryData();
  const openId = searchParams.get('open');

  return (
    <TreatiesClient
      profile={profile}
      initialTreaties={treaties}
      errorMessage={errorMessage}
      openId={openId}
    />
  );
}

export default function TreatiesPage() {
  return (
    <Suspense fallback={null}>
      <TreatiesPageInner />
    </Suspense>
  );
}
