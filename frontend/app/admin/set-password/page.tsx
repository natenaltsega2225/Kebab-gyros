'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../admin.module.css';

function meetsPasswordPolicy(value: string) {
  return value.length >= 12
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

export default function SetPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function clearSession() {
    await fetch('/api/admin/session/logout', { method: 'POST' }).catch(() => undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('New password confirmation does not match.');
      return;
    }
    if (!meetsPasswordPolicy(newPassword)) {
      setError('New password must be at least 12 characters and include upper, lower, number, and symbol.');
      return;
    }

    setIsSubmitting(true);
    try {
      const loginResponse = await fetch('/api/admin/session/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: currentPassword }),
      });
      const loginPayload = await loginResponse.json().catch(() => null);
      if (!loginResponse.ok || !loginPayload?.user) {
        setError(loginPayload?.error || 'Unable to verify temporary credentials.');
        return;
      }

      const sessionResponse = await fetch('/api/admin/session/me', { cache: 'no-store' });
      const sessionPayload = await sessionResponse.json().catch(() => null);
      if (!sessionResponse.ok || !sessionPayload?.user) {
        await clearSession();
        setError('Unable to verify the temporary-password session. Please try again.');
        return;
      }
      if (sessionPayload.user.mustChangePassword !== true) {
        await clearSession();
        setError('This account is not awaiting a password change. Please sign in normally.');
        return;
      }

      const changeResponse = await fetch('/api/admin/session/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const changePayload = await changeResponse.json().catch(() => null);
      if (!changeResponse.ok || !changePayload?.changed) {
        setError(changePayload?.error || 'Unable to set your password.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      await clearSession();
      router.replace('/admin?passwordChanged=1');
    } catch {
      setError('Unable to set your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="set-password-title">
        <p className={styles.eyebrow}>Kebab Gyros</p>
        <h1 id="set-password-title">Set your password</h1>
        <p className={styles.policy}>Use your temporary credentials to set a new password. Use at least 12 characters, including an uppercase letter, lowercase letter, number, and symbol.</p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <label htmlFor="setup-username">Email or username</label>
          <input id="setup-username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={isSubmitting} required />
          <label htmlFor="setup-current-password">Current/Temporary Password</label>
          <div className={styles.passwordField}><input id="setup-current-password" name="currentPassword" type={showCurrentPassword ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={isSubmitting} required /><button type="button" className={styles.passwordToggle} onClick={() => setShowCurrentPassword((visible) => !visible)} aria-label={`${showCurrentPassword ? 'Hide' : 'Show'} current or temporary password`} aria-pressed={showCurrentPassword} disabled={isSubmitting}>{showCurrentPassword ? 'Hide' : 'Show'}</button></div>
          <label htmlFor="setup-new-password">New Password</label>
          <div className={styles.passwordField}><input id="setup-new-password" name="newPassword" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={isSubmitting} required /><button type="button" className={styles.passwordToggle} onClick={() => setShowNewPassword((visible) => !visible)} aria-label={`${showNewPassword ? 'Hide' : 'Show'} new password`} aria-pressed={showNewPassword} disabled={isSubmitting}>{showNewPassword ? 'Hide' : 'Show'}</button></div>
          <label htmlFor="setup-confirm-password">Confirm New Password</label>
          <div className={styles.passwordField}><input id="setup-confirm-password" name="confirmNewPassword" type={showConfirmNewPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} disabled={isSubmitting} required /><button type="button" className={styles.passwordToggle} onClick={() => setShowConfirmNewPassword((visible) => !visible)} aria-label={`${showConfirmNewPassword ? 'Hide' : 'Show'} password confirmation`} aria-pressed={showConfirmNewPassword} disabled={isSubmitting}>{showConfirmNewPassword ? 'Hide' : 'Show'}</button></div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Setting password…' : 'Set password'}</button>
        </form>
      </section>
    </main>
  );
}
