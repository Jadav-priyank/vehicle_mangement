'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProfileMenu from '../components/ProfileMenu';

export default function ProfilePage() {
  const [username, setUsername] = useState('Traminsto');
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.username) setUsername(data.username);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    window.location.href = '/login';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Please enter your current password to authorize changes.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    if (newUsername && newUsername.trim().length < 3) {
      setError('New ID must be at least 3 characters long.');
      return;
    }

    if (!newUsername.trim() && !newPassword.trim()) {
      setError('Please provide a new ID or new password to update.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim() || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update credentials.');
        return;
      }

      setSuccess('Credentials updated successfully!');
      if (data.username) {
        setUsername(data.username);
      }
      setNewUsername('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Update error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" suppressHydrationWarning>
      {/* Navigation */}
      <nav className="nav-bar">
        <Link href="/" className="nav-logo">
          <span className="nav-logo-icon">🚗</span>
          <span className="mobile-only">VRM</span>
          <span className="desktop-only">Vehicle Records</span>
        </Link>

        <div className="nav-right">
          <div className="nav-links">
            <Link href="/" className="nav-link">
              🔍 Search
            </Link>
            <Link href="/admin" className="nav-link">
              ⚙️ Admin
            </Link>
          </div>
          <div className="nav-right-divider" />
          <ProfileMenu
            username={username}
            onLogout={handleLogout}
          />
        </div>
      </nav>

      {/* Header */}
      <div className="profile-page-header">
        <h1 className="page-title">Update ID & Password</h1>
        <p className="page-subtitle">
          Manage your login credentials for direct website access
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="profile-card" style={{ animation: 'fadeInUp 0.3s ease' }}>
        <div className="profile-card-header">
          <div className="profile-card-icon">🔐</div>
          <div>
            <h2 className="profile-card-title">Security Credentials</h2>
            <p className="profile-card-desc">
              Current ID:{' '}
              <strong style={{ color: 'var(--text-accent)' }}>{username}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="alert-badge error" role="alert">
            <span>⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="alert-badge success" role="alert">
            <span>✅</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-settings-form">
          {/* Current ID Info */}
          <div className="form-group">
            <label className="form-label">Current Active ID</label>
            <div className="current-id-display">
              <span className="user-icon">👤</span>
              <span className="current-id-text">{username}</span>
              <span className="current-id-badge">Active</span>
            </div>
          </div>

          {/* Change ID / Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-new-id">
              New Login ID (optional)
            </label>
            <input
              id="profile-new-id"
              type="text"
              className="form-input"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="off"
            />

            <p className="form-field-hint">
              Minimum 3 characters. Leave blank if you only want to change password.
            </p>
          </div>

          <div className="divider-line" style={{ margin: '1.5rem 0' }} />

          {/* Current Password (Required) */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-current-pass">
              Current Password <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="password-input-wrap">
              <input
                id="profile-current-pass"
                type={showCurrentPass ? 'text' : 'password'}
                className="form-input password-input"
                placeholder="Enter current password to authorize changes"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                tabIndex="-1"
                aria-label="Toggle password visibility"
              >
                {showCurrentPass ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="form-field-hint">
              Required for security verification before saving any changes.
            </p>
          </div>

          {/* New Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="profile-new-pass">
              New Password (optional)
            </label>
            <div className="password-input-wrap">
              <input
                id="profile-new-pass"
                type={showNewPass ? 'text' : 'password'}
                className="form-input password-input"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowNewPass(!showNewPass)}
                tabIndex="-1"
                aria-label="Toggle password visibility"
              >
                {showNewPass ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="form-field-hint">
              Minimum 4 characters. Leave blank if you only want to change ID.
            </p>
          </div>

          {/* Confirm New Password */}
          {newPassword && (
            <div className="form-group">
              <label className="form-label" htmlFor="profile-confirm-pass">
                Confirm New Password <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="profile-confirm-pass"
                type={showNewPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}


          <div className="profile-actions-row">
            <Link href="/" className="btn btn-secondary">
              &larr; Back to Search
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="profile-save-credentials-btn"
            >
              {loading ? (
                <>
                  <div className="loading-spinner" style={{ width: 18, height: 18 }} />
                  Saving Changes...
                </>
              ) : (
                <>💾 Save New Credentials</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
