'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLibraryData } from '@/components/library-store';
import { CasesClient } from '@/components/cases-client';

function CasesPageInner() {
  const searchParams = useSearchParams();
  const { profile, cases, errorMessage } = useLibraryData();
  const openId = searchParams.get('open');

  return (
    <CasesClient
      profile={profile}
      initialCases={cases}
      errorMessage={errorMessage}
      openId={openId}
    />
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={null}>
      <CasesPageInner />
    </Suspense>
  );
}
