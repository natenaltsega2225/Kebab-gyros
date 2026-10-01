'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import styles from './page.module.css';

type Hour = { id: number; dayOfWeek: number; isClosed: boolean; openTime: string | null; closeTime: string | null; note: string | null };
type AdminUser = { username: string; role: string; mustChangePassword: boolean };

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HoursPage() {
  const router = useRouter();
  const [hours, setHours] = useState<Hour[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    const response = await fetch('/api/admin/hours', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 403) { router.replace('/admin'); return; }
    if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load hours.');
    setHours(payload.data.sort((first: Hour, second: Hour) => first.dayOfWeek - second.dayOfWeek));
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const session = await fetch('/api/admin/session/me', { cache: 'no-store' });
        const sessionData = await session.json().catch(() => null);
        if (!session.ok || !sessionData?.user) { router.replace('/admin'); return; }
        if (sessionData.user.mustChangePassword) { router.replace('/admin/change-password'); return; }
        if (!active) return;
        setCurrentUser(sessionData.user);
        await load();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load hours.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  // The initial protected load runs once; every successful per-day save refreshes the list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function updateHour(id: number, update: Partial<Hour>) { setHours((current) => current.map((hour) => hour.id === id ? { ...hour, ...update } : hour)); }

  async function save(hour: Hour) {
    setSaving(hour.id); setError('');
    try {
      const body = hour.isClosed
        ? { isClosed: true, openTime: null, closeTime: null, note: hour.note }
        : { isClosed: false, openTime: hour.openTime, closeTime: hour.closeTime, note: hour.note };
      if (!hour.isClosed && (!hour.openTime || !hour.closeTime)) throw new Error('Open days require opening and closing times.');
      const response = await fetch(`/api/admin/hours/${hour.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save hours.');
      await load(); setSuccess(`${days[hour.dayOfWeek]} saved.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save hours.'); }
    finally { setSaving(null); }
  }

  if (loading) return <main className={styles.page}><p role="status">Loading hours…</p></main>;
  if (!currentUser) return <main className={styles.page}><p className={styles.error} role="alert">The admin session is unavailable.</p></main>;

  return <AdminShell username={currentUser.username} role={currentUser.role} title="Working Hours">
    <section className={styles.layout} aria-labelledby="hours-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Kebab Gyros</p><h2 id="hours-title">Working hours</h2><p>Save each day separately. Closed days will save without opening or closing times.</p></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      <div className={styles.grid}>{hours.map((hour) => <article key={hour.id} className={styles.dayCard}><div className={styles.dayHeading}><h3>{days[hour.dayOfWeek]}</h3><label className={styles.toggle}><input type="checkbox" checked={hour.isClosed} disabled={saving !== null} onChange={(event) => updateHour(hour.id, { isClosed: event.target.checked })}/><span>Closed</span></label></div><div className={styles.times}><label>Opening time<input type="time" value={hour.openTime || ''} disabled={hour.isClosed || saving !== null} onChange={(event) => updateHour(hour.id, { openTime: event.target.value })}/></label><label>Closing time<input type="time" value={hour.closeTime || ''} disabled={hour.isClosed || saving !== null} onChange={(event) => updateHour(hour.id, { closeTime: event.target.value })}/></label></div><label className={styles.note}>Note<input value={hour.note || ''} disabled={saving !== null} onChange={(event) => updateHour(hour.id, { note: event.target.value || null })}/></label><button disabled={saving !== null} onClick={() => save(hour)}>{saving === hour.id ? 'Saving…' : 'Save day'}</button></article>)}</div>
    </section>
  </AdminShell>;
}
