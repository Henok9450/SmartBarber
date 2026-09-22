// Authentication and Session helper with RBAC support

const TOKEN_KEY = 'sb_token';
const USER_KEY = 'sb_user';

// Default initial state: Owner (so user can test immediately with full privileges)
const DEFAULT_USER = {
  id: 1,
  username: 'owner',
  name: 'Abebe (Owner)',
  amharic_name: 'አበበ (ባለቤት)',
  role: 'owner', // 'owner', 'cashier', 'barber', 'customer'
  barber_id: null
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || 'usr_1_owner';
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_USER;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event('auth-change'));
}

export function clearSession() {
  const guest = { id: 0, username: 'guest', name: 'Guest / Customer', role: 'customer', barber_id: null };
  localStorage.setItem(TOKEN_KEY, '');
  localStorage.setItem(USER_KEY, JSON.stringify(guest));
  window.dispatchEvent(new Event('auth-change'));
}

// Authenticated fetch wrapper that automatically appends Bearer token
export async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  return fetch(url, {
    ...options,
    headers
  });
}
