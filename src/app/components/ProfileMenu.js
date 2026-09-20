'use client';
 
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function ProfileMenu({ username, onOpenAccountModal, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <button
        type="button"
        className={`profile-avatar-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={`Profile (${username || 'Traminsto'})`}
        aria-label="User Profile"
        id="nav-profile-logo-btn"
      >
        <span className="profile-avatar-icon">👤</span>
      </button>

      {isOpen && (
        <div className="profile-dropdown-menu" role="menu">
          <div className="profile-dropdown-header">
            <div className="profile-dropdown-avatar">👤</div>
            <div className="profile-dropdown-info">
              <div className="profile-dropdown-username">{username || 'Traminsto'}</div>
              <div className="profile-dropdown-status">Active Account</div>
            </div>
          </div>

          <div className="profile-dropdown-divider" />

          <Link
            href="/profile"
            className="profile-dropdown-item"
            onClick={() => {
              setIsOpen(false);
              if (onOpenAccountModal) onOpenAccountModal();
            }}
            id="menu-update-credentials-btn"
          >
            <span className="dropdown-item-icon">✏️</span>
            <span>Update ID & Password</span>
          </Link>


          <button
            type="button"
            className="profile-dropdown-item logout"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            id="menu-logout-btn"
          >
            <span className="dropdown-item-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
