'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import ProfileMenu from './components/ProfileMenu';

function normalize(str) {
  return str.toUpperCase().replace(/[\s\-\.]/g, '');
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState({});
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [username, setUsername] = useState('Traminsto');
  const debounceTimer = useRef(null);

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

  const doSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/vehicles?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(value), 400);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    doSearch(query);
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
            <Link href="/" className="nav-link active">
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
      <h1 className="page-title">Search Vehicles</h1>
      <p className="page-subtitle">
        Enter a vehicle number to find its record and linked photos
      </p>

      {/* Search Box */}
      <form onSubmit={handleSubmit} className="search-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="e.g. GJ 16 AY 9293"
            value={query}
            onChange={handleInputChange}
            autoFocus
            autoComplete="off"
            id="vehicle-search-input"
          />
        </div>
        {query.trim() && (
          <p className="search-hint">
            Searching as: <span className="search-normalized">{normalize(query)}</span>
          </p>
        )}
      </form>

      {/* Loading */}
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Searching...</span>
        </div>
      )}

      {/* Results */}
      {!loading && searched && results && (
        <>
          {results.length === 0 ? (
            <div className="not-found">
              <div className="not-found-icon">🚫</div>
              <h2 className="not-found-title">Not in Database</h2>
              <p className="not-found-text">
                No vehicle matching &quot;<strong>{normalize(query)}</strong>&quot; was found.
                <br />
                Try a partial number or check the spelling.
              </p>
            </div>
          ) : (
            <div className="results-container">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                Found <strong style={{ color: 'var(--text-accent)' }}>{results.length}</strong> result{results.length !== 1 ? 's' : ''}
              </p>

              {results.map((vehicle) => {
                const vehiclePhotos = vehicle.photos || (vehicle.photo ? [vehicle.photo] : []);
                const currentIdx = selectedPhotoIndex[vehicle.id] || 0;
                const activePhoto = vehiclePhotos[currentIdx] || vehiclePhotos[0];

                // Gather all sibling vehicles across all photos of this vehicle
                const siblingVehicles = [];
                const seenIds = new Set([vehicle.id]);

                vehiclePhotos.forEach((p) => {
                  if (p.vehicles && Array.isArray(p.vehicles)) {
                    p.vehicles.forEach((sv) => {
                      if (!seenIds.has(sv.id)) {
                        seenIds.add(sv.id);
                        siblingVehicles.push(sv);
                      }
                    });
                  }
                });

                const activeSrc = activePhoto?.url || (activePhoto?.filename ? `/uploads/${activePhoto.filename}` : '');

                return (
                  <div className="result-card" key={vehicle.id}>
                    <div className="result-card-content">
                      {/* Photo column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {activeSrc ? (
                          <img
                            src={activeSrc}
                            alt={vehicle.vehicleNumber}
                            className="result-photo"
                            loading="lazy"
                            onClick={() => setLightboxPhoto(activeSrc)}
                            style={{ cursor: 'pointer' }}
                            title="Click to zoom photo"
                          />
                        ) : (
                          <div className="result-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', fontSize: '2rem' }}>
                            🚗
                          </div>
                        )}

                        {/* Multi-photo thumbnail selector */}
                        {vehiclePhotos.length > 1 && (
                          <div className="photo-gallery-row result-gallery-row">
                            {vehiclePhotos.map((p, idx) => {
                              const pSrc = p.url || (p.filename ? `/uploads/${p.filename}` : '');
                              return (
                                <img
                                  key={p.id}
                                  src={pSrc}
                                  alt={`Photo ${idx + 1}`}
                                  className={`photo-gallery-thumb ${idx === currentIdx ? 'active' : ''}`}
                                  onClick={() =>
                                    setSelectedPhotoIndex((prev) => ({
                                      ...prev,
                                      [vehicle.id]: idx,
                                    }))
                                  }
                                  title={`View photo ${idx + 1}`}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Info column */}
                      <div className="result-info">
                        <div className="result-vehicle-number">
                          {vehicle.vehicleNumber}
                        </div>

                        <div className="result-meta">
                          <span className="result-meta-item">
                            📅 {new Date(vehicle.addedDate).toLocaleDateString()}
                          </span>
                          {vehiclePhotos.length > 1 && (
                            <span className="badge badge-accent">
                              📸 {vehiclePhotos.length} photos
                            </span>
                          )}
                          {siblingVehicles.length > 0 && (
                            <span className="badge badge-accent">
                              🔗 {siblingVehicles.length} linked vehicle(s)
                            </span>
                          )}
                        </div>

                        {vehicle.notes && (
                          <div className="result-notes">{vehicle.notes}</div>
                        )}

                        {siblingVehicles.length > 0 && (
                          <div className="result-siblings">
                            <div className="result-siblings-label">
                              Other vehicles sharing photo(s)
                            </div>
                            <div className="result-siblings-list">
                              {siblingVehicles.map((v) => (
                                <span key={v.id} className="sibling-tag">
                                  {v.vehicleNumber}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Empty state — no search yet */}
      {!loading && !searched && (
        <div className="empty-state">
          <div className="empty-state-icon">🔎</div>
          <p className="empty-state-text">
            Type a vehicle number above to search the database.
            <br />
            Spaces, dashes, and case are ignored automatically.
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxPhoto(null)}>
              ✕
            </button>
            <img src={lightboxPhoto} alt="Full view" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}


