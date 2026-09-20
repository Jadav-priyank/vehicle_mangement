'use client';

import { useState } from 'react';

export default function AccountModal({ isOpen, onClose, currentUsername, onUpdated }) {
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleReset = () => {
    setNewUsername('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
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
      if (onUpdated) {
        onUpdated(data.username || newUsername.trim() || currentUsername);
      }

      setTimeout(() => {
        handleReset();
      }, 1500);
    } catch (err) {
      console.error('Update error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleReset}>
      <div
        className="modal-content account-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-account-title"
      >
        <div className="modal-header">
          <div className="modal-header-icon-wrap">
            <span className="modal-header-icon">🔐</span>
            <div>
              <h2 id="modal-account-title" className="modal-title">
                Update ID & Password
              </h2>
              <p className="modal-subtitle">
                Current ID:{' '}
                <strong style={{ color: 'var(--text-accent)' }}>
                  {currentUsername || 'Traminsto'}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleReset}
            aria-label="Close"
          >
            ✕
          </button>
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

        <form onSubmit={handleSubmit} className="account-form">
          {/* Change ID / Username */}
          <div className="form-group">
            <label className="form-label" htmlFor="update-new-id">
              New Login ID (optional)
            </label>
            <input
              id="update-new-id"
              type="text"
              className="input-field"
              placeholder={`Leave blank to keep "${currentUsername || 'Traminsto'}"`}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoComplete="off"
            />
            <p className="form-field-hint">
              Minimum 3 characters. Leave blank if you only want to change the password.
            </p>
          </div>

          <div className="divider-line" />

          {/* Current Password (Required) */}
          <div className="form-group">
            <label className="form-label" htmlFor="update-current-pass">
              Current Password <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <div className="password-input-wrap">
              <input
                id="update-current-pass"
                type={showCurrentPass ? 'text' : 'password'}
                className="input-field password-input"
                placeholder="Enter current password to verify"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                tabIndex="-1"
              >
                {showCurrentPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="update-new-pass">
              New Password (optional)
            </label>
            <div className="password-input-wrap">
              <input
                id="update-new-pass"
                type={showNewPass ? 'text' : 'password'}
                className="input-field password-input"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowNewPass(!showNewPass)}
                tabIndex="-1"
              >
                {showNewPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          {newPassword && (
            <div className="form-group">
              <label className="form-label" htmlFor="update-confirm-pass">
                Confirm New Password <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                id="update-confirm-pass"
                type={showNewPass ? 'text' : 'password'}
                className="input-field"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}


          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="update-credentials-submit-btn"
            >
              {loading ? 'Saving Changes...' : 'Save New Credentials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
