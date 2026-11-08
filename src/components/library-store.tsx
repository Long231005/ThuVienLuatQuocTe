'use client';

import React, { createContext, useContext } from 'react';
import type { CaseRecord, TreatyRecord, UserProfile } from '@/lib/types';

interface LibraryDataContextValue {
  profile: UserProfile;
  treaties: TreatyRecord[];
  cases: CaseRecord[];
  errorMessage: string | null;
}

const LibraryDataContext = createContext<LibraryDataContextValue | null>(null);

export function LibraryDataProvider({
  value,
  children,
}: {
  value: LibraryDataContextValue;
  children: React.ReactNode;
}) {
  return (
    <LibraryDataContext.Provider value={value}>
      {children}
    </LibraryDataContext.Provider>
  );
}

export function useLibraryData(): LibraryDataContextValue {
  const ctx = useContext(LibraryDataContext);
  if (!ctx) {
    throw new Error('useLibraryData phải được gọi bên trong LibraryDataProvider');
  }
  return ctx;
}
