'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both ID and Password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid ID or Password');
        return;
      }

      // Successful login
      router.push(from);
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <div className="login-badge-icon">🚗</div>
        <h1 className="login-title">Direct Login</h1>
        <p className="login-subtitle">
          Sign in to access and manage Vehicle Records
        </p>
      </div>

      {error && (
        <div className="login-error-alert" role="alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label className="form-label" htmlFor="login-username">
            Login ID / Username
          </label>
          <input
            id="login-username"
            type="text"
            className="login-input"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError('');
            }}
            autoFocus
            autoComplete="username"
            required
          />

        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Password
          </label>
          <div className="password-input-wrap">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="login-input password-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>


        <button
          type="submit"
          className="login-submit-btn"
          disabled={loading}
          id="login-submit-btn"
        >
          {loading ? (
            <span className="btn-spinner-wrap">
              <span className="loading-spinner small" />
              <span>Authenticating...</span>
            </span>
          ) : (
            <span>Direct Sign In &rarr;</span>
          )}
        </button>
      </form>

      <div className="login-footer">
        <p className="login-security-notice">
          🔒 Secure authentication session. Vehicle Records Manager
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrapper">
      <div className="login-bg-glow glow-1" />
      <div className="login-bg-glow glow-2" />
      <Suspense fallback={<div className="login-card"><div className="loading-spinner" /></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
