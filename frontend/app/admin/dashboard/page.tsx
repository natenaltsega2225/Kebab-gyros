import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import AdminShell from '../../../components/admin/AdminShell';
import styles from './page.module.css';

const SESSION_COOKIE = 'admin_session';

type AdminUser = {
  username: string;
  role: string;
  mustChangePassword: boolean;
};

type DashboardMetrics = {
  totalMenuItems: number;
  activeMenuItems: number;
  popularItems: number;
  categories: number;
  activeAdminUsers: number;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
};

type DashboardIconName = 'menu' | 'active' | 'popular' | 'categories' | 'users' | 'restaurant' | 'hours' | 'audit';

function DashboardIcon({ name }: { name: DashboardIconName }) {
  const paths: Record<DashboardIconName, ReactNode> = {
    menu: <><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    active: <><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.3 2.3 4.8-5"/></>,
    popular: <path d="m12 3 2.3 5.1 5.5.6-4.1 3.7 1.1 5.4-4.8-2.8-4.8 2.8 1.1-5.4-4.1-3.7 5.5-.6z"/>,
    categories: <><path d="M4 5h7l2 2h7v12H4z"/><path d="M4 5v14"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.8-3.3 2.8-5 5.5-5s4.7 1.7 5.5 5M16 10c2.5 0 4.2 1.7 4.5 4"/></>,
    restaurant: <><path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-6h6v6"/></>,
    hours: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></>,
    audit: <><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function isAllowedApiBaseUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:'
      && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

async function getApiResponse<T>(url: string, token: string) {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
    return { status: response.status, data: response.ok && payload?.success ? payload.data : undefined };
  } catch {
    return { status: 503, data: undefined };
  }
}

export default async function DashboardPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!token) redirect('/admin');

  if (!isAllowedApiBaseUrl(apiBaseUrl)) {
    return <main className={styles.page}><p className={styles.outage} role="alert">The admin service is temporarily unavailable.</p></main>;
  }

  const userResponse = await getApiResponse<AdminUser>(`${apiBaseUrl}/api/admin/auth/me`, token);
  if (userResponse.status === 401 || userResponse.status === 403) redirect('/admin');
  if (!userResponse.data) {
    return <main className={styles.page}><p className={styles.outage} role="alert">The admin service is temporarily unavailable.</p></main>;
  }
  if (userResponse.data.mustChangePassword) redirect('/admin/change-password');

  const metricsResponse = await getApiResponse<DashboardMetrics>(`${apiBaseUrl}/api/admin/dashboard`, token);
  if (metricsResponse.status === 401 || metricsResponse.status === 403) redirect('/admin');
  if (!metricsResponse.data) {
    return <AdminShell username={userResponse.data.username} role={userResponse.data.role} title="Dashboard"><p className={styles.outage} role="alert">Dashboard metrics are temporarily unavailable.</p></AdminShell>;
  }

  const metrics = [
    ['Total Menu Items', metricsResponse.data.totalMenuItems, 'All menu items', 'menu'],
    ['Active Menu Items', metricsResponse.data.activeMenuItems, 'Items visible to customers', 'active'],
    ['Active Popular Items', metricsResponse.data.popularItems, 'Active items marked Popular.', 'popular'],
    ['Categories', metricsResponse.data.categories, 'Stored menu categories', 'categories'],
    ['Active Admin Users', metricsResponse.data.activeAdminUsers, 'Enabled admin and manager accounts', 'users'],
  ];

  const shortcuts = [
    ['/admin/menu', 'Menu Management', 'Add, update, and organize menu items.', 'menu'],
    ['/admin/categories', 'Categories', 'Manage stored menu categories.', 'categories'],
    ['/admin/restaurant', 'Restaurant Settings', 'Update restaurant details and ordering links.', 'restaurant'],
    ['/admin/hours', 'Working Hours', 'Set opening hours for each day.', 'hours'],
    ...(userResponse.data.role === 'admin' ? [
      ['/admin/users', 'Admin Users', 'Manage administrator and manager accounts.', 'users'],
      ['/admin/audit-logs', 'Audit Logs', 'Review recent administrator activity.', 'audit'],
    ] : []),
  ];

  return (
    <AdminShell username={userResponse.data.username} role={userResponse.data.role} title="Dashboard">
      <section className={styles.dashboard} aria-labelledby="dashboard-title">
        <p className={styles.eyebrow}>Restaurant overview</p>
        <h2 id="dashboard-title">At a glance</h2>
        <dl className={styles.metrics}>
          {metrics.map(([label, value, description, icon]) => <div className={styles.metric} key={label}><span className={styles.metricIcon}><DashboardIcon name={icon as DashboardIconName}/></span><dt>{label}</dt><dd>{value}</dd><small>{description}</small></div>)}
        </dl>
        <section className={styles.shortcuts} aria-labelledby="management-title">
          <div><p className={styles.eyebrow}>Quick links</p><h2 id="management-title">Management</h2></div>
          <div className={styles.shortcutGrid}>
            {shortcuts.map(([href, label, description, icon]) => <Link className={styles.shortcut} href={href} key={href}><span className={styles.shortcutIcon}><DashboardIcon name={icon as DashboardIconName}/></span><strong>{label}</strong><span>{description}</span><b>Open <span aria-hidden="true">→</span></b></Link>)}
          </div>
        </section>
      </section>
    </AdminShell>
  );
}
