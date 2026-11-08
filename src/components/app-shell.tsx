'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  BookOpen,
  Scale,
  LayoutDashboard,
  FileDown,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Filter,
} from 'lucide-react';
import { useDisplayScope } from '@/components/providers';
import { logoutAction } from '@/app/actions/auth';
import type { UserProfile } from '@/lib/types';

interface AppShellProps {
  profile: UserProfile;
  children: React.ReactNode;
}

export function AppShell({ profile, children }: AppShellProps) {
  const pathname = usePathname();
  const { scope, setScope, toggleScope } = useDisplayScope();
  const { resolvedTheme, setTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const navItems = [
    { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { href: '/treaties', label: 'Điều ước & Tập quán', icon: BookOpen },
    { href: '/cases', label: 'Thư viện Án lệ', icon: Scale },
    { href: '/import', label: 'Nhập / Xuất dữ liệu', icon: FileDown },
    ...(profile.role === 'admin'
      ? [{ href: '/admin', label: 'Quản trị', icon: ShieldCheck }]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutAction();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full text-[var(--text-sidebar-primary)] select-none">
      {/* 1. Tên ứng dụng + mô tả */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="serif text-xl font-bold leading-snug text-[var(--text-sidebar-primary)]">
              Thư viện Luật Quốc tế
            </h1>
            <p className="text-sm text-[var(--text-sidebar-secondary)] mt-0.5">
              Điều ước, tập quán và án lệ
            </p>
          </div>
          {drawerOpen && (
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Đóng bảng điều hướng"
              className="md:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-md text-[var(--text-sidebar-secondary)] hover:bg-[var(--bg-sidebar-hover)]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Menu điều hướng */}
      <nav aria-label="Điều hướng chính" className="flex flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 min-h-[44px] px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                active
                  ? 'bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)] shadow-sm border-l-4 border-amber-400 pl-2.5'
                  : 'text-[var(--text-sidebar-secondary)] hover:bg-[var(--bg-sidebar-hover)] hover:text-[var(--text-sidebar-primary)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 3. Khối "Phạm vi hiển thị": Tất cả bài | Bài của tôi */}
      <div className="mt-6 pt-5 border-t border-[var(--border-sidebar)]">
        <p className="text-xs font-semibold uppercase text-[var(--text-sidebar-secondary)] mb-2">
          Phạm vi hiển thị
        </p>
        <div
          role="group"
          aria-label="Chọn phạm vi hiển thị bài viết"
          className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[var(--bg-sidebar-muted)] border border-[var(--border-sidebar)]"
        >
          <button
            type="button"
            onClick={() => setScope('all')}
            aria-pressed={scope === 'all'}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              scope === 'all'
                ? 'bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)] shadow-sm'
                : 'text-[var(--text-sidebar-secondary)] hover:text-[var(--text-sidebar-primary)]'
            }`}
          >
            Tất cả bài
          </button>
          <button
            type="button"
            onClick={() => setScope('mine')}
            aria-pressed={scope === 'mine'}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
              scope === 'mine'
                ? 'bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)] shadow-sm'
                : 'text-[var(--text-sidebar-secondary)] hover:text-[var(--text-sidebar-primary)]'
            }`}
          >
            Bài của tôi
          </button>
        </div>
      </div>

      {/* 4. Cuối sidebar: nút đổi giao diện sáng/tối, tên người dùng, nút Đăng xuất */}
      <div className="mt-auto pt-6 border-t border-[var(--border-sidebar)] space-y-3">
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="w-full flex items-center justify-between min-h-[44px] px-3.5 py-2 rounded-lg text-sm bg-[var(--bg-sidebar-muted)] hover:bg-[var(--bg-sidebar-hover)] text-[var(--text-sidebar-primary)] border border-[var(--border-sidebar)] transition cursor-pointer"
          aria-label="Đổi giao diện sáng hoặc tối"
        >
          <span className="flex items-center gap-2.5">
            <Sun className="w-4 h-4 text-amber-400 hidden dark:inline" />
            <Moon className="w-4 h-4 text-[#1B3A6B] inline dark:hidden" />
            <span className="hidden dark:inline">Giao diện: Tối</span>
            <span className="inline dark:hidden">Giao diện: Sáng</span>
          </span>
          <span className="text-xs text-[var(--text-sidebar-secondary)] underline">
            Đổi
          </span>
        </button>

        <div className="px-3.5 py-2.5 rounded-lg bg-[var(--bg-sidebar-muted)] border border-[var(--border-sidebar)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-sidebar-secondary)]">
              Đang đăng nhập
            </p>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-sm font-semibold text-[var(--text-sidebar-primary)] truncate">
                @{profile.username}
              </span>
              {profile.role === 'admin' && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200 border border-amber-300/60 dark:border-amber-300/30">
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-lg text-sm font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/50 dark:hover:bg-red-800/70 dark:text-red-100 dark:border-red-400/25 transition cursor-pointer disabled:opacity-60"
        >
          <LogOut className="w-4 h-4" />
          <span>{loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Thanh trên cố định cho điện thoại */}
      <header className="md:hidden sticky top-0 z-40 bg-[var(--bg-sidebar)] text-[var(--text-sidebar-primary)] border-b border-[var(--border-sidebar)] shadow-xs">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở menu điều hướng"
            aria-expanded={drawerOpen}
            className="min-w-[44px] min-h-[44px] -ml-2 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-sidebar-hover)] active:scale-[.98]"
          >
            <Menu className="w-6 h-6" />
            <span className="sr-only">Mở menu</span>
          </button>
          <span className="serif text-base font-bold truncate px-2">
            Thư viện Luật Quốc tế
          </span>
          <div className="text-xs text-[var(--text-sidebar-secondary)] font-medium truncate max-w-[110px]">
            @{profile.username}
          </div>
        </div>

        {/* Chip nhỏ dưới thanh trên cho biết phạm vi hiện tại, chạm vào để đổi nhanh */}
        <div className="bg-[var(--bg-sidebar-muted)] px-4 py-1.5 border-t border-[var(--border-sidebar)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-sidebar-secondary)]">
            Phạm vi đang xem:
          </span>
          <button
            type="button"
            onClick={toggleScope}
            className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1 rounded-full text-xs font-semibold bg-[var(--bg-sidebar-active)] text-[var(--text-sidebar-active)] active:scale-[.98]"
          >
            <Filter className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {scope === 'all'
                ? 'Tất cả bài (Chạm để đổi)'
                : 'Bài của tôi (Chạm để đổi)'}
            </span>
          </button>
        </div>
      </header>

      {/* Ngăn kéo sidebar trên điện thoại */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
        >
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full bg-[var(--bg-sidebar)] p-5 overflow-y-auto z-10 shadow-2xl border-r border-[var(--border-sidebar)]">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Sidebar cố định (fixed) bên trái trên máy tính — luôn đi theo khi cuộn trang */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-64 lg:w-72 bg-[var(--bg-sidebar)] p-5 overflow-y-auto border-r border-[var(--border-sidebar)]">
        {sidebarContent}
      </aside>

      {/* Nội dung chính — chừa lề trái bằng đúng chiều rộng sidebar trên máy tính */}
      <main className="flex-1 md:pl-64 lg:pl-72 min-w-0 max-w-full">
        <div className="p-4 sm:p-6 md:p-10 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
