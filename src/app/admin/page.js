'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ProfileMenu from '../components/ProfileMenu';

const getPhotoSrc = (p) => p?.url || (p?.filename ? `/uploads/${p.filename}` : '');

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('add');
  const [vehicles, setVehicles] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Add form state
  const [vehicleNumbers, setVehicleNumbers] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{ file, preview, id }]
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Edit modal state
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editNumber, setEditNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPhotoIds, setEditPhotoIds] = useState([]);

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkPhotoIds, setBulkPhotoIds] = useState([]);

  // Lightbox preview state
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Filter state for vehicle list
  const [filterQuery, setFilterQuery] = useState('');

  // Auth state
  const [username, setUsername] = useState('Traminsto');

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

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

  const fetchData = useCallback(async () => {
    try {
      const [vehiclesRes, photosRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/photos'),
      ]);
      const vehiclesData = await vehiclesRes.json();
      const photosData = await photosRes.json();
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setPhotos(Array.isArray(photosData) ? photosData : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process files (support multiple)
  const addFiles = (fileList) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedFiles((prev) => [
          ...prev,
          {
            file,
            preview: ev.target.result,
            id: `${file.name}-${Date.now()}-${Math.random()}`,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-selecting same files
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeUploadedFile = (id) => {
    setUploadedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleSelectExistingPhoto = (id) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const toggleBulkPhoto = (id) => {
    setBulkPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const toggleEditPhoto = (id) => {
    setEditPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Add vehicle(s)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const numbers = vehicleNumbers
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (numbers.length === 0) {
      addToast('Enter at least one vehicle number', 'error');
      return;
    }

    if (uploadedFiles.length === 0) {
      addToast('Please upload at least one photo', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const finalPhotoIds = [...selectedPhotoIds];

      // Upload newly selected photos
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach((item) => {
          formData.append('files', item.file);
        });

        const uploadRes = await fetch('/api/photos', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error('Photo upload failed');
        const uploadData = await uploadRes.json();

        const createdList = uploadData.photos || (uploadData.id ? [uploadData] : []);
        createdList.forEach((p) => finalPhotoIds.push(p.id));
      }

      if (finalPhotoIds.length === 0) {
        addToast('No valid photos found', 'error');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumbers: numbers,
          photoIds: finalPhotoIds,
          notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to create vehicles');

      addToast(`Added ${numbers.length} vehicle(s) with ${finalPhotoIds.length} photo(s)!`);
      setVehicleNumbers('');
      setNotes('');
      setSelectedPhotoIds([]);
      setUploadedFiles([]);
      fetchData();
    } catch (err) {
      console.error(err);
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete vehicle
  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle record?')) return;
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      addToast('Vehicle and associated photos deleted');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Delete individual photo
  const handleDeletePhoto = async (id) => {
    if (!confirm('Delete this photo?')) return;
    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete photo');
      addToast('Photo deleted');
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Clean up all unused photos
  const handleCleanUnusedPhotos = async () => {
    const unused = photos.filter((p) => !p.vehicles || p.vehicles.length === 0);
    if (unused.length === 0) return;
    if (!confirm(`Delete all ${unused.length} unused photo(s)?`)) return;

    try {
      for (const p of unused) {
        await fetch(`/api/photos/${p.id}`, { method: 'DELETE' });
      }
      addToast(`Deleted ${unused.length} unused photo(s)`);
      fetchData();
    } catch (err) {
      addToast('Failed to delete all unused photos', 'error');
    }
  };

  // Open edit modal
  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setEditNumber(vehicle.vehicleNumber);
    setEditNotes(vehicle.notes || '');
    setEditPhotoIds(vehicle.photos ? vehicle.photos.map((p) => p.id) : []);
  };

  // Save edited vehicle
  const handleEditSave = async () => {
    if (!editingVehicle) return;
    try {
      const res = await fetch(`/api/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleNumber: editNumber,
          notes: editNotes,
          photoIds: editPhotoIds,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      addToast('Vehicle updated');
      setEditingVehicle(null);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Bulk import
  const handleBulkImport = async () => {
    const numbers = bulkText
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (numbers.length === 0) {
      addToast('Paste some vehicle numbers first', 'error');
      return;
    }
    if (bulkPhotoIds.length === 0) {
      addToast('Select at least one photo for bulk import', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleNumbers: numbers, photoIds: bulkPhotoIds }),
      });
      if (!res.ok) throw new Error('Bulk import failed');
      addToast(`Imported ${numbers.length} vehicle(s) successfully!`);
      setBulkText('');
      setBulkPhotoIds([]);
      fetchData();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Export
  const handleExport = () => {
    window.open('/api/export', '_blank');
  };

  // Filtered vehicles
  const filteredVehicles = filterQuery
    ? vehicles.filter((v) =>
        v.vehicleNumber.toUpperCase().replace(/[\s\-\.]/g, '').includes(
          filterQuery.toUpperCase().replace(/[\s\-\.]/g, '')
        )
      )
    : vehicles;

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
            <Link href="/admin" className="nav-link active">
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





      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? '✅' : '❌'} {t.message}
          </div>
        ))}
      </div>

      <h1 className="page-title">Admin Panel</h1>
      <p className="page-subtitle">Add, edit, delete, and manage vehicle records with multiple photos</p>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{vehicles.length}</div>
          <div className="stat-label">Vehicles</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{photos.length}</div>
          <div className="stat-label">Photos</div>
        </div>
        <div className="stat-card">
          <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ width: '100%' }} suppressHydrationWarning>
            📥 Export CSV
          </button>
          <div className="stat-label" style={{ marginTop: '4px' }}>Download</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ Add
        </button>
        <button
          className={`tab ${activeTab === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          📋 Records
        </button>
        <button
          className={`tab ${activeTab === 'photos' ? 'active' : ''}`}
          onClick={() => setActiveTab('photos')}
        >
          🖼️ Photos
        </button>
        <button
          className={`tab ${activeTab === 'bulk' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          📦 Bulk
        </button>
      </div>



      {/* ===== ADD TAB ===== */}
      {activeTab === 'add' && (
        <div className="card" style={{ animation: 'fadeInUp 0.3s ease' }}>
          <h2 className="section-title">➕ Add Vehicle Record</h2>
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label className="form-label">Vehicle Number(s)</label>
              <textarea
                className="form-textarea"
                placeholder={"GJ 16 AY 9293\nMH 12 AB 1234\nDL 01 XY 5678"}
                value={vehicleNumbers}
                onChange={(e) => setVehicleNumbers(e.target.value)}
                rows={3}
                id="add-vehicle-numbers"
              />
              <p className="form-hint">Separate multiple numbers with commas or new lines</p>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Spotted at toll plaza"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                id="add-notes"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Vehicle Photo(s)</label>
                {uploadedFiles.length > 0 && (
                  <span className="badge badge-accent">
                    📸 {uploadedFiles.length} photo(s) selected
                  </span>
                )}
              </div>

              {/* Upload area */}
              <div
                className={`file-upload-area ${uploadedFiles.length > 0 ? 'active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="file-input-hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <div className="file-upload-icon">📸</div>
                <p className="file-upload-text">
                  <strong>Click to upload</strong> or drag & drop (select one or multiple)
                </p>
                <p className="form-hint">JPG, PNG, WebP — You can add multiple photos for this vehicle</p>
              </div>

              {/* Uploaded files preview strip */}
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    New photos to upload ({uploadedFiles.length}):
                  </div>
                  <div className="multi-preview-list">
                    {uploadedFiles.map((item) => (
                      <div key={item.id} className="multi-preview-item">
                        <img src={item.preview} alt="Upload preview" />
                        <button
                          type="button"
                          className="multi-preview-remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUploadedFile(item.id);
                          }}
                          title="Remove photo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', marginTop: 'var(--space-md)' }}
              id="add-submit-btn"
            >
              {submitting ? (
                <>
                  <div className="loading-spinner" style={{ width: 18, height: 18 }} />
                  Saving Vehicle Record...
                </>
              ) : (
                <>➕ Add Vehicle(s)</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ===== RECORDS TAB ===== */}
      {activeTab === 'vehicles' && (
        <div style={{ animation: 'fadeInUp 0.3s ease' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Filter vehicles..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              id="filter-vehicles"
            />
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <span>Loading...</span>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">
                {filterQuery ? 'No vehicles match your filter' : 'No vehicle records yet. Add some in the Add tab!'}
              </p>
            </div>
          ) : (
            <div className="vehicle-list">
              {filteredVehicles.map((vehicle) => {
                const vehiclePhotos = vehicle.photos || (vehicle.photo ? [vehicle.photo] : []);
                const primaryPhoto = vehiclePhotos[0];

                return (
                  <div key={vehicle.id} className="vehicle-list-item" style={{ alignItems: 'flex-start' }}>
                    {primaryPhoto ? (
                      <img
                        src={getPhotoSrc(primaryPhoto)}
                        alt={vehicle.vehicleNumber}
                        className="vehicle-list-thumb"
                        loading="lazy"
                        onClick={() => setLightboxPhoto(getPhotoSrc(primaryPhoto))}
                        style={{ cursor: 'pointer' }}
                        title="Click to view full photo"
                      />
                    ) : (
                      <div className="vehicle-list-thumb" style={{ background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🚗
                      </div>
                    )}
                    <div className="vehicle-list-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        <span className="vehicle-list-number">{vehicle.vehicleNumber}</span>
                        {vehiclePhotos.length > 1 && (
                          <span className="badge badge-accent" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                            📸 {vehiclePhotos.length} photos
                          </span>
                        )}
                      </div>

                      <div className="vehicle-list-date">
                        {new Date(vehicle.addedDate).toLocaleDateString()}
                        {vehicle.notes && ` · ${vehicle.notes}`}
                      </div>

                      {/* Photo thumbnails strip if multiple photos */}
                      {vehiclePhotos.length > 1 && (
                        <div className="photo-gallery-row">
                          {vehiclePhotos.map((p) => (
                            <img
                              key={p.id}
                              src={getPhotoSrc(p)}
                              alt={vehicle.vehicleNumber}
                              className="photo-gallery-thumb"
                              onClick={() => setLightboxPhoto(getPhotoSrc(p))}
                              title="Click to expand"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="vehicle-list-actions">
                      <button
                        className="btn btn-secondary btn-icon"
                        title="Edit"
                        onClick={() => openEditModal(vehicle)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-danger btn-icon"
                        title="Delete"
                        onClick={() => handleDelete(vehicle.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== PHOTOS TAB ===== */}
      {activeTab === 'photos' && (
        <div style={{ animation: 'fadeInUp 0.3s ease' }}>
          {/* Clean up unused photos banner */}
          {photos.filter((p) => !p.vehicles || p.vehicles.length === 0).length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-md)',
              padding: 'var(--space-sm) var(--space-md)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
            }}>
              <span style={{ fontSize: '0.85rem', color: '#f87171' }}>
                ⚠️ {photos.filter((p) => !p.vehicles || p.vehicles.length === 0).length} photo(s) have no linked vehicle records
              </span>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleCleanUnusedPhotos}
                style={{ padding: '4px 12px', minHeight: '32px' }}
              >
                🗑️ Clean Up Unused Photos
              </button>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🖼️</div>
              <p className="empty-state-text">No photos uploaded yet</p>
            </div>
          ) : (
            <div className="photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
              {photos.map((photo) => {
                const vehicleCount = photo.vehicles?.length || 0;
                return (
                  <div key={photo.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={getPhotoSrc(photo)}
                      alt={photo.originalName}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', cursor: 'pointer' }}
                      loading="lazy"
                      onClick={() => setLightboxPhoto(getPhotoSrc(photo))}
                      title="Click to view full photo"
                    />
                    <div style={{ padding: 'var(--space-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {photo.vehicles && photo.vehicles.length > 0 ? (
                            photo.vehicles.map((v) => (
                              <div
                                key={v.id}
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.03em',
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={v.vehicleNumber}
                              >
                                {v.vehicleNumber}
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#f87171', fontStyle: 'italic' }}>
                              No vehicle
                            </span>
                          )}
                        </div>
                        {vehicleCount === 0 && (
                          <button
                            type="button"
                            className="btn btn-danger btn-icon"
                            style={{ width: 24, height: 24, minHeight: 24, minWidth: 24, padding: 0, fontSize: '0.75rem', flexShrink: 0 }}
                            title="Delete unused photo"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== BULK TAB ===== */}
      {activeTab === 'bulk' && (
        <div className="card" style={{ animation: 'fadeInUp 0.3s ease' }}>
          <h2 className="section-title">📦 Bulk Import</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
            Paste a list of vehicle numbers (one per line or comma-separated) and link them to one or more photos.
          </p>

          <div className="form-group">
            <label className="form-label">Vehicle Numbers</label>
            <textarea
              className="form-textarea"
              placeholder={"GJ 16 AY 9293\nMH 12 AB 1234\nDL 01 XY 5678\nRJ 14 CD 4321"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              id="bulk-numbers"
            />
            <p className="form-hint">
              {bulkText.split(/[\n,]/).filter((n) => n.trim()).length} number(s) detected
            </p>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Select Photo(s) to Link</label>
              {bulkPhotoIds.length > 0 && (
                <span className="badge badge-accent">
                  📸 {bulkPhotoIds.length} photo(s) selected
                </span>
              )}
            </div>
            {photos.length === 0 ? (
              <p className="form-hint">Upload photos in the Add tab first</p>
            ) : (
              <div className="photo-grid">
                {photos.map((photo) => {
                  const isSelected = bulkPhotoIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`photo-grid-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleBulkPhoto(photo.id)}
                    >
                      <img src={getPhotoSrc(photo)} alt={photo.originalName} />
                      {isSelected && <span className="photo-check-badge">✓</span>}
                      {photo.vehicles?.length > 0 && (
                        <span className="photo-count">{photo.vehicles.length}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleBulkImport}
            disabled={submitting}
            style={{ width: '100%' }}
            id="bulk-import-btn"
          >
            {submitting ? (
              <>
                <div className="loading-spinner" style={{ width: 18, height: 18 }} />
                Importing...
              </>
            ) : (
              <>📦 Import All ({bulkPhotoIds.length} photo(s) selected)</>
            )}
          </button>
        </div>
      )}



      {/* ===== EDIT MODAL ===== */}
      {editingVehicle && (
        <div className="modal-overlay" onClick={() => setEditingVehicle(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">✏️ Edit Vehicle</h3>

            <div className="form-group">
              <label className="form-label">Vehicle Number</label>
              <input
                type="text"
                className="form-input"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                id="edit-vehicle-number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input
                type="text"
                className="form-input"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes"
                id="edit-notes"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Manage Photos ({editPhotoIds.length} linked)</label>
              <div className="photo-grid" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {photos.map((photo) => {
                  const isSelected = editPhotoIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`photo-grid-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleEditPhoto(photo.id)}
                    >
                      <img src={getPhotoSrc(photo)} alt={photo.originalName} />
                      {isSelected && <span className="photo-check-badge">✓</span>}
                    </div>
                  );
                })}
              </div>
              <p className="form-hint">Click photos to add or remove them from this vehicle record</p>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingVehicle(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleEditSave}>
                💾 Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== LIGHTBOX MODAL ===== */}
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


