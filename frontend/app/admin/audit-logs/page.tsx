import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import styles from './page.module.css';

type User = { username: string; role: string; mustChangePassword: boolean };
type Log = { id: number; action: string; entityType: string; entityId: string | number | null; createdAt: string; username: string | null };

function allowed(value: string | undefined) {
  try {
    const url = new URL(value || '');
    return url.protocol === 'https:' || (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1'));
  } catch { return false; }
}

async function api<T>(url: string, token: string) {
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    return { status: response.status, data: response.ok && payload?.success ? payload.data as T : undefined };
  } catch { return { status: 503, data: undefined }; }
}

export default async function AuditLogs() {
  const token = (await cookies()).get('admin_session')?.value;
  const apiBaseUrl = process.env.API_BASE_URL;
  if (!token) redirect('/admin');
  if (!allowed(apiBaseUrl)) return <main className={styles.page}><p className={styles.error} role="alert">The admin service is temporarily unavailable.</p></main>;

  const me = await api<User>(`${apiBaseUrl}/api/admin/auth/me`, token);
  if (me.status === 401 || me.status === 403) redirect('/admin');
  if (!me.data) return <main className={styles.page}><p className={styles.error} role="alert">The admin service is temporarily unavailable.</p></main>;
  if (me.data.mustChangePassword) redirect('/admin/change-password');
  if (me.data.role !== 'admin') return <AdminShell username={me.data.username} role={me.data.role} title="Audit Logs"><section className={styles.accessDenied}><h2>Access denied</h2><p>Audit logs are available to administrators only.</p></section></AdminShell>;

  const logs = await api<Log[]>(`${apiBaseUrl}/api/admin/audit-logs?limit=100`, token);
  if (!logs.data) return <AdminShell username={me.data.username} role={me.data.role} title="Audit Logs"><p className={styles.error} role="alert">Audit logs are temporarily unavailable.</p></AdminShell>;

  return <AdminShell username={me.data.username} role={me.data.role} title="Audit Logs">
    <section className={styles.layout} aria-labelledby="audit-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Read-only activity</p><h2 id="audit-title">Audit logs</h2><p>Most recent 100 administrator actions.</p></div>
      {logs.data.length === 0 ? <p className={styles.empty}>No audit activity found.</p> : <div className={styles.tableWrap}><table><thead><tr><th>Date and time</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead><tbody>{logs.data.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString()}</td><td>{log.username || 'System'}</td><td>{log.action}</td><td>{log.entityType}{log.entityId !== null ? ` #${log.entityId}` : ''}</td></tr>)}</tbody></table></div>}
    </section>
  </AdminShell>;
}
