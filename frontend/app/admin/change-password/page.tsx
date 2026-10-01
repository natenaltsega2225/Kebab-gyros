'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await fetch('/api/admin/session/me', { cache: 'no-store' });
        if (!response.ok) router.replace('/admin');
      } catch {
        router.replace('/admin');
      } finally {
        setIsCheckingSession(false);
      }
    }
    void verifySession();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmNewPassword) {
      setError('New password confirmation does not match.');
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/session/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.changed) {
        setError(payload.error || 'Unable to change password.');
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccess('Password changed. Signing out…');
      await fetch('/api/admin/session/logout', { method: 'POST' });
      router.replace('/admin');
    } catch {
      setError('Unable to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return <main className={styles.page}><p role="status">Verifying session…</p></main>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="change-password-title">
        <p className={styles.eyebrow}>Kebab Gyros</p>
        <h1 id="change-password-title">Change password</h1>
        <p className={styles.policy}>Use at least 12 characters, including an uppercase letter, lowercase letter, number, and symbol.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="current-password">Current/Temporary Password</label>
          <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={isSubmitting} required />
          <label htmlFor="new-password">New password</label>
          <input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isSubmitting} required />
          <label htmlFor="confirm-new-password">Confirm New Password</label>
          <input id="confirm-new-password" name="confirmNewPassword" type="password" autoComplete="new-password" minLength={12} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} disabled={isSubmitting} required />
          {error && <p className={styles.error} role="alert">{error}</p>}
          {success && <p className={styles.notice} role="status">{success}</p>}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Changing password…' : 'Change password'}</button>
        </form>
      </section>
    </main>
  );
}
