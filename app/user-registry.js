const LOCAL_USERS_KEY = 'csmate-users';

function loadRawUsers() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Kunne ikke læse brugere fra storage', error);
    return [];
  }
}

function saveRawUsers(users) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.warn('Kunne ikke gemme brugere', error);
  }
}

export function upsertUser(user) {
  if (!user || !user.id) return;

  const users = loadRawUsers();
  const index = users.findIndex(entry => entry && entry.id === user.id);
  const base = {
    id: user.id,
    email: user.email || '',
    name: user.name || ''
  };

  if (index === -1) {
    users.push({ ...base, ...user });
  } else {
    users[index] = { ...users[index], ...base, ...user };
  }

  saveRawUsers(users);
}

export function listUsers() {
  return loadRawUsers();
}

export function updateUser(id, patch) {
  if (!id) return;
  const users = loadRawUsers();
  const index = users.findIndex(entry => entry && entry.id === id);
  if (index === -1) return;
  users[index] = { ...users[index], ...patch };
  saveRawUsers(users);
}
