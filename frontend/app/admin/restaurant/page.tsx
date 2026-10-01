'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '../../../components/admin/AdminShell';
import styles from './page.module.css';

type Settings = Record<'restaurantName' | 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'zipCode' | 'phone' | 'email' | 'googleMapsUrl' | 'orderOnlineUrl' | 'logoUrl', string | null>;
type AdminUser = { username: string; role: string; mustChangePassword: boolean };
const settingKeys = ['restaurantName', 'addressLine1', 'addressLine2', 'city', 'state', 'zipCode', 'phone', 'email', 'googleMapsUrl', 'orderOnlineUrl', 'logoUrl'] as const;

function toFormSettings(value: unknown): Settings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(settingKeys.map((key) => [key, typeof source[key] === 'string' ? source[key] : ''])) as Settings;
}

export default function RestaurantPage() {
  const router = useRouter();
  const [data, setData] = useState<Settings | null>(null);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    const response = await fetch('/api/admin/restaurant', { cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (response.status === 401 || response.status === 403) { router.replace('/admin'); return; }
    if (!response.ok || !payload?.success || !payload.data) throw new Error(payload?.error || 'Unable to load restaurant settings.');
    setData(toFormSettings(payload.data));
  }

  useEffect(() => {
    async function initialize() {
      try {
        const session = await fetch('/api/admin/session/me', { cache: 'no-store' });
        const sessionData = await session.json().catch(() => null);
        if (!session.ok || !sessionData?.user) { router.replace('/admin'); return; }
        if (sessionData.user.mustChangePassword) { router.replace('/admin/change-password'); return; }
        setCurrentUser(sessionData.user);
        await load();
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load restaurant settings.'); }
      finally { setLoading(false); }
    }
    void initialize();
  // The initial protected load runs once; saving explicitly refreshes the full settings object.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin/restaurant', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save restaurant settings.');
      await load(); setSuccess('Restaurant settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save restaurant settings.'); }
    finally { setBusy(false); }
  }

  function field(key: keyof Settings, label: string, required = true) {
    return <label>{label}<input type={key === 'email' ? 'email' : key.includes('Url') ? 'url' : 'text'} required={required} value={data?.[key] || ''} disabled={busy} onChange={(event) => setData((current) => current ? { ...current, [key]: event.target.value } : current)}/></label>;
  }

  if (loading) return <main className={styles.page}><p role="status">Loading restaurant settings…</p></main>;
  if (!currentUser) return <main className={styles.page}><p className={styles.error} role="alert">The admin session is unavailable.</p></main>;

  return <AdminShell username={currentUser.username} role={currentUser.role} title="Restaurant Settings">
    <section className={styles.layout} aria-labelledby="settings-title">
      <div className={styles.intro}><p className={styles.eyebrow}>Kebab Gyros</p><h2 id="settings-title">Restaurant settings</h2><p>Review details carefully before saving. All settings are saved together.</p></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      {data && <form className={styles.form} onSubmit={save}>
        <section className={styles.section} aria-labelledby="identity-title"><div className={styles.sectionHeading}><p className={styles.eyebrow}>Business profile</p><h3 id="identity-title">Business Identity</h3></div><div className={styles.fieldGrid}>{field('restaurantName', 'Restaurant name')}{field('logoUrl', 'Logo URL', false)}</div></section>
        <section className={styles.section} aria-labelledby="contact-title"><div className={styles.sectionHeading}><p className={styles.eyebrow}>Contact details</p><h3 id="contact-title">Contact &amp; Location</h3></div><div className={styles.fieldGrid}>{field('addressLine1', 'Address line 1')}{field('addressLine2', 'Address line 2', false)}{field('city', 'City')}{field('state', 'State')}{field('zipCode', 'ZIP code')}{field('phone', 'Phone')}{field('email', 'Email')}</div></section>
        <section className={styles.section} aria-labelledby="links-title"><div className={styles.sectionHeading}><p className={styles.eyebrow}>Customer destinations</p><h3 id="links-title">Customer Links</h3></div><div className={styles.fieldGrid}>{field('googleMapsUrl', 'Google Maps URL', false)}{field('orderOnlineUrl', 'SkyTab ordering URL', false)}</div><div className={styles.previews}>{data.googleMapsUrl && <a href={data.googleMapsUrl} target="_blank" rel="noreferrer">Preview map <span aria-hidden="true">↗</span></a>}{data.orderOnlineUrl && <a href={data.orderOnlineUrl} target="_blank" rel="noreferrer">Preview ordering link <span aria-hidden="true">↗</span></a>}</div></section>
        <div className={styles.saveRow}><button disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
      </form>}
    </section>
  </AdminShell>;
}
