import { fetchAdminUsersList } from '@/lib/data';
import { AppShell } from '@/components/app-shell';
import { AdminClient } from '@/components/admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { profile, users, errorMessage } = await fetchAdminUsersList();

  return (
    <AppShell profile={profile}>
      <AdminClient
        profile={profile}
        users={users}
        errorMessage={errorMessage}
      />
    </AppShell>
  );
}
