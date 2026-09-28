import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
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

function isAllowedApiBaseUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return process.env.NODE_ENV === 'development'
      && url.protocol === 'http:'
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
    return <main className={styles.page}><p className={styles.outage} role="alert">Dashboard metrics are temporarily unavailable.</p></main>;
  }

  const metrics = [
    ['Total menu items', metricsResponse.data.totalMenuItems],
    ['Active menu items', metricsResponse.data.activeMenuItems],
    ['Popular items', metricsResponse.data.popularItems],
    ['Categories', metricsResponse.data.categories],
    ['Active admin users', metricsResponse.data.activeAdminUsers],
  ];

  return (
    <main className={styles.page}>
      <section className={styles.dashboard} aria-labelledby="dashboard-title">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Kebab Gyros</p>
            <h1 id="dashboard-title">Admin dashboard</h1>
            <p>Signed in as <strong>{userResponse.data.username}</strong> · {userResponse.data.role}</p>
          </div>
          <form action="/api/admin/session/logout" method="post">
            <button type="submit">Log out</button>
          </form>
        </header>
        <dl className={styles.metrics}>
          {metrics.map(([label, value]) => <div className={styles.metric} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <Link className={styles.categoriesLink} href="/admin/categories">Manage categories</Link>
        <Link className={styles.categoriesLink} href="/admin/menu">Manage menu items</Link>
        <Link className={styles.categoriesLink} href="/admin/restaurant">Restaurant settings</Link>
        <Link className={styles.categoriesLink} href="/admin/hours">Working hours</Link>
        {userResponse.data.role === 'admin' && <Link className={styles.categoriesLink} href="/admin/audit-logs">Audit logs</Link>}
      </section>
    </main>
  );
}
