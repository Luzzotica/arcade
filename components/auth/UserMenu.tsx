'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from './AuthModal';
import styles from './UserMenu.module.css';

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [updating, setUpdating] = useState(false);
  const supabase = createClient();

  // Fetch profile data
  useEffect(() => {
    if (!user) return;
    
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setDisplayName(data.display_name || '');
      }
    };
    
    fetchProfile();
  }, [user, supabase]);

  const startEditingName = () => {
    setNewDisplayName(displayName);
    setEditingName(true);
  };

  const saveDisplayName = async () => {
    if (!user || updating || !newDisplayName.trim()) return;
    
    setUpdating(true);
    const trimmedName = newDisplayName.trim();
    
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmedName })
      .eq('id', user.id);
    
    if (!error) {
      setDisplayName(trimmedName);
      setEditingName(false);
    }
    setUpdating(false);
  };

  const cancelEditingName = () => {
    setEditingName(false);
    setNewDisplayName('');
  };

  if (loading) {
    return <div className={styles.skeleton} />;
  }

  if (!user) {
    return (
      <>
        <button
          className={styles.signInButton}
          onClick={() => setShowAuthModal(true)}
        >
          Sign In
        </button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // Use display_name from profile (fetched from DB), fallback to user metadata
  const shownName = displayName || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Player';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className={styles.container}>
      <button
        className={styles.userButton}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder}>
            {shownName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className={styles.displayName}>{shownName}</span>
        <svg
          className={`${styles.chevron} ${showDropdown ? styles.open : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div
            className={styles.backdrop}
            onClick={() => setShowDropdown(false)}
          />
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span className={styles.email}>{user.email}</span>
            </div>
            <div className={styles.dropdownDivider} />
            
            {/* Display Name Editor */}
            <div className={styles.nameSection}>
              <span className={styles.nameLabel}>Display Name</span>
              {editingName ? (
                <div className={styles.nameEditor}>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    maxLength={30}
                    className={styles.nameInput}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveDisplayName();
                      if (e.key === 'Escape') cancelEditingName();
                    }}
                  />
                  <div className={styles.nameActions}>
                    <button 
                      onClick={saveDisplayName} 
                      disabled={updating || !newDisplayName.trim()}
                      className={styles.saveBtn}
                    >
                      Save
                    </button>
                    <button onClick={cancelEditingName} className={styles.cancelBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.nameDisplay}>
                  <span>{shownName}</span>
                  <button onClick={startEditingName} className={styles.editBtn}>
                    Edit
                  </button>
                </div>
              )}
            </div>
            
            <div className={styles.dropdownDivider} />
            <button
              className={styles.dropdownItem}
              onClick={() => {
                signOut();
                setShowDropdown(false);
              }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4.293 4.293a1 1 0 01-1.414-1.414L11.586 7H6a1 1 0 110-2h5.586L8.293 1.707a1 1 0 011.414-1.414L14 4.586v2.828z"
                  clipRule="evenodd"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
