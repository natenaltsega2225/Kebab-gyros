'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

type AdminUser = {
  username: string;
  role: string;
  mustChangePassword: boolean;
};

export default function AdminPage() {
  const router = useRouter();
  const [user] = useState<AdminUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await fetch('/api/admin/session/me', { cache: 'no-store' });
        const payload = await response.json();
        if (response.ok && payload.user) {
          const mustChangePassword = Boolean(payload.user.mustChangePassword);
          router.replace(mustChangePassword ? '/admin/change-password' : '/admin/dashboard');
        }
      } catch {
        // An unavailable session check leaves the sign-in form available.
      } finally {
        setIsLoading(false);
      }
    }
    void verifySession();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.user) {
        setError(payload.error || 'Unable to sign in.');
        return;
      }
      router.replace(Boolean(payload.user.mustChangePassword) ? '/admin/change-password' : '/admin/dashboard');
      setPassword('');
    } catch {
      setError('Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="admin-title">
        <p className={styles.eyebrow}>Kebab Gyros</p>
        <h1 id="admin-title">Admin</h1>
        {isLoading ? <p role="status">Verifying session…</p> : user ? (
          <div className={styles.welcome}>
            <p>Signed in as <strong>{user.username}</strong></p>
            <p>Role: <strong>{user.role}</strong></p>
            {Boolean(user.mustChangePassword) && <p className={styles.notice} role="status"><Link href="/admin/change-password">Password change required.</Link></p>}
            {!Boolean(user.mustChangePassword) && <Link className={styles.dashboardLink} href="/admin/dashboard">Go to dashboard</Link>}
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label htmlFor="username">Email or username</label>
            <input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={isSubmitting} required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting} required />
            <Link href="/admin/forgot-password">Forgot password?</Link>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
