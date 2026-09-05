import { httpClient, sessionStorage } from './common/httpClient';

const publicRequest = Object.freeze({ auth: false });

export const authApi = Object.freeze({
  signup: (payload) => httpClient.post('/auth/signup', payload, publicRequest),
  login: (payload) => httpClient.post('/auth/login', payload, publicRequest),

  checkEmail: async (email) => {
    try {
      return await httpClient.get(`/auth/check-email?email=${encodeURIComponent(email)}`, publicRequest);
    } catch (error) {
      console.warn('Backend check email error:', error);
      return { available: false, message: '중복 확인 통신 실패' };
    }
  },

  checkNickname: async (nickname) => {
    try {
      return await httpClient.get(`/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`, publicRequest);
    } catch (error) {
      console.warn('Backend check nickname error:', error);
      return { available: false, message: '중복 확인 통신 실패' };
    }
  },

  logout: async () => {
    const session = sessionStorage.capture();
    let ended = false;
    try {
      await httpClient.post('/auth/logout', undefined, { retryOnUnauthorized: false });
    } catch (error) {
      console.warn('Logout request warning:', error);
    } finally {
      if (sessionStorage.isCurrent(session)) {
        sessionStorage.clear();
        ended = true;
      }
    }
    return ended;
  },

  withdraw: async () => {
    const session = sessionStorage.capture();
    const data = await httpClient.post('/auth/withdraw');
    if (sessionStorage.isCurrent(session)) sessionStorage.clear();
    return data;
  },

  forgotPassword: (email) => httpClient.post('/auth/forgot-password', { email }, publicRequest)
});
