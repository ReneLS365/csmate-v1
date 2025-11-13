// app/services/user-service.js
//
// Alt der handler om brugere uden for selve login-flows kører gennem her.
// LIGE NU: wrapper om localStorage (user-registry).
// SENERE: kan pege på backend (REST/GraphQL/Auth0 Management API).

import {
  upsertUser,
  listUsers,
  updateUser,
} from '../user-registry.js';

export function registerCurrentUserFromAuth(authUser, tenant) {
  if (!authUser) return;
  const userId =
    authUser.sub ||
    authUser.user_id ||
    authUser.id ||
    authUser.email ||
    authUser.emailKey ||
    null;
  if (!userId) return;

  upsertUser({
    id: userId,
    email: authUser.email || authUser.emailKey || '',
    name: authUser.name || authUser.nickname || authUser.displayName || '',
    role: tenant?.role || 'user',
    firmId: tenant?.firmId || null,
  });
}

export function getAllUsers() {
  return listUsers();
}

export function assignUserToFirm(userId, firmId) {
  if (!userId) return;
  // LIGE NU: local patch.
  updateUser(userId, { firmId });
  // TODO backend:
  // - Auth0 Management API: update app_metadata.firmId for dette userId.
}

export function makeUserFirmAdmin(userId, firmId) {
  if (!userId) return;
  updateUser(userId, { role: 'firma-admin', firmId });
  // TODO backend:
  // - Auth0 Management API: set app_metadata.role="firma-admin", firmId.
}
