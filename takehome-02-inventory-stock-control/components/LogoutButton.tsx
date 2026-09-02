'use client';

import { logout } from '../actions/auth';

export default function LogoutButton() {
  async function handleLogout() {
    await logout();
    window.location.href = '/auth/login';
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        padding: '10px 18px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        backgroundColor: 'white',
        cursor: 'pointer',
      }}
    >
      Logout
    </button>
  );
}