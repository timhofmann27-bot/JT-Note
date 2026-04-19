import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;
let socket: Socket | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const getAuthToken = () => authToken;

// WebSocket connection management
export const connectSocket = (token: string): Socket => {
  if (socket?.connected) return socket;
  socket = io(BACKEND_URL, {
    path: '/api/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });
  socket.on('connect', () => console.log('[WS] Connected'));
  socket.on('disconnect', () => console.log('[WS] Disconnected'));
  socket.on('connect_error', (e) => console.log('[WS] Error:', e.message));
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;

// Auth (Anonymous: Username + Passkey)
export const authAPI = {
  register: (data: { username: string; passkey: string; name: string; callsign?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; passkey: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePasskey: (data: { old_passkey: string; new_passkey: string }) =>
    api.post('/auth/change-passkey', data),
  generateUsername: () => api.get('/auth/generate-username'),
  refresh: () => api.post('/auth/refresh'),
  deleteAccount: () => api.delete('/auth/account'),
  createMagicQR: () => api.post('/auth/magic-qr'),
  verifyMagicToken: (token: string) => api.post('/auth/magic-verify', { token }),
};

export const usersAPI = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
};

export const profileAPI = {
  update: (data: any) => api.put('/profile', data),
};

export const contactsAPI = {
  list: () => api.get('/contacts'),
  requests: () => api.get('/contacts/requests'),
  addByCode: (code: string) => api.post('/contacts/add-by-code', { code }),
  acceptRequest: (id: string) => api.post(`/contacts/request/${id}/accept`),
  rejectRequest: (id: string) => api.post(`/contacts/request/${id}/reject`),
  remove: (contactId: string) => api.delete(`/contacts/${contactId}`),
  getMyCode: () => api.get('/users/my-add-code'),
  resetCode: () => api.post('/users/reset-add-code'),
};

export const chatsAPI = {
  list: () => api.get('/chats'),
  create: (data: any) => api.post('/chats', data),
  get: (id: string) => api.get(`/chats/${id}`),
  pollUpdates: () => api.get('/chats/poll/updates'),
  leave: (id: string) => api.post(`/chats/${id}/leave`),
};

export const messagesAPI = {
  list: (chatId: string, limit?: number) => api.get(`/messages/${chatId}`, { params: { limit } }),
  send: (data: any) => api.post('/messages', data),
  markRead: (messageIds: string[]) => api.post('/messages/read', { message_ids: messageIds }),
  poll: (chatId: string, after?: string) => api.get(`/messages/poll/${chatId}`, { params: { after } }),
  delete: (id: string) => api.delete(`/messages/${id}`),
};

export const typingAPI = {
  set: (chatId: string) => api.post(`/typing/${chatId}`),
  get: (chatId: string) => api.get(`/typing/${chatId}`),
};

export const keysAPI = {
  upload: (publicKey: string, fingerprint?: string) =>
    api.post('/keys/upload', { public_key: publicKey, fingerprint }),
  get: (userId: string) => api.get(`/keys/${userId}`),
  getBatch: (userIds: string[]) => api.get('/keys/batch', { params: { user_ids: userIds.join(',') } }),
};

export const pushAPI = {
  register: (pushToken: string, platform: string = 'expo') =>
    api.post('/push/register', { push_token: pushToken, platform }),
  unregister: () => api.delete('/push/unregister'),
};

export const encryptedMessagesAPI = {
  send: (data: {
    chat_id: string;
    ciphertext: string;
    nonce: string;
    dh_public?: string | null;
    msg_num?: number;
    message_type?: string;
    security_level?: string;
    self_destruct_seconds?: number | null;
    is_emergency?: boolean;
  }) => api.post('/messages/encrypted', data),
};

export default api;
