// 모든 Domain API가 공유하는 Backend 기본 주소다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

const ACCESS_TOKEN_KEY = 'petcare_token';
const REFRESH_TOKEN_KEY = 'petcare_refresh_token';
const USER_KEY = 'petcare_user';

export const AUTH_EXPIRED_EVENT = 'petcare:auth-expired';

let sessionVersion = 0;
const captureSession = () => ({ version: sessionVersion, user: localStorage.getItem(USER_KEY) });
const isCurrentSession = (session) => session.version === sessionVersion
  && session.user === localStorage.getItem(USER_KEY);
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === null || [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY].includes(event.key)) {
      sessionVersion++;
    }
  });
}

const clearSession = () => {
  sessionVersion++;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
};

const createHeaders = (additionalHeaders = {}, useAuth = true) => {
  const headers = { Accept: 'application/json', ...additionalHeaders };
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (useAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
};

const readResponseBody = async (response) => {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  const text = await response.text();
  return text || null;
};

export class HttpClientError extends Error {
  constructor(message, status, responseBody = null) {
    super(message);
    this.name = 'HttpClientError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

let refreshOperation = null;

const refreshAccessToken = async (session) => {
  if (!isCurrentSession(session)) return null;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearSession();
    return null;
  }

  if (!refreshOperation || !isCurrentSession(refreshOperation.session)
      || refreshOperation.refreshToken !== refreshToken) {
    const operation = { session, refreshToken };
    refreshOperation = operation;
    const stillCurrent = () => isCurrentSession(session)
      && localStorage.getItem(REFRESH_TOKEN_KEY) === refreshToken;
    operation.promise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
      .then(async (response) => {
        const body = await readResponseBody(response);
        if (!stillCurrent()) return null;
        if (!response.ok || !body?.accessToken) {
          clearSession();
          return null;
        }
        localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken);
        if (body.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, body.refreshToken);
        return body.accessToken;
      })
      .catch(() => {
        if (stillCurrent()) clearSession();
        return null;
      })
      .finally(() => {
        if (refreshOperation === operation) refreshOperation = null;
      });
  }

  return refreshOperation.promise;
};

const request = async (endpoint, options = {}) => {
  const {
    auth = true,
    retryOnUnauthorized = true,
    responseType = 'body',
    headers: additionalHeaders,
    ...fetchOptions
  } = options;
  const session = captureSession();
  const requestAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: createHeaders(additionalHeaders, auth)
  });

  if (auth && !isCurrentSession(session)) {
    throw new HttpClientError('로그인 상태가 변경되었습니다. 다시 요청해 주세요.', 401);
  }
  if (response.status === 401 && auth && retryOnUnauthorized) {
    // 같은 세션의 다른 요청이 이미 갱신했다면 다시 Refresh하지 않는다.
    const currentToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const newAccessToken = currentToken && currentToken !== requestAccessToken
      ? currentToken : await refreshAccessToken(session);
    if (newAccessToken && isCurrentSession(session)) {
      return request(endpoint, { ...options, retryOnUnauthorized: false });
    }
  }

  // 갱신 후에도 거절된 세션만 종료한다. 늦은 401로 새 Login/갱신 Token을 지우지 않는다.
  if (response.status === 401 && auth && !retryOnUnauthorized
      && isCurrentSession(session) && requestAccessToken === localStorage.getItem(ACCESS_TOKEN_KEY)) {
    clearSession();
  }

  const responseBody = response.ok && responseType === 'blob'
    ? await response.blob()
    : await readResponseBody(response);
  if (auth && response.ok && !isCurrentSession(session)) {
    throw new HttpClientError('로그인 상태가 변경되었습니다. 다시 요청해 주세요.', 401);
  }
  if (!response.ok) {
    throw new HttpClientError(
      responseBody?.message || `API 요청에 실패했습니다. (${response.status})`,
      response.status,
      responseBody
    );
  }
  return responseBody;
};

const requestWithJsonBody = (method, endpoint, body, options = {}) => request(endpoint, {
  ...options,
  method,
  headers: { 'Content-Type': 'application/json', ...options.headers },
  body: JSON.stringify(body)
});

export const httpClient = Object.freeze({
  get: (endpoint, options) => request(endpoint, options),
  getBlob: (endpoint, options = {}) => request(endpoint, { ...options, responseType: 'blob' }),
  post: (endpoint, body, options) => requestWithJsonBody('POST', endpoint, body, options),
  // FormData의 multipart boundary는 Browser가 생성하므로 Content-Type을 직접 지정하지 않는다.
  postForm: (endpoint, formData, options = {}) => request(endpoint, {
    ...options,
    method: 'POST',
    body: formData
  }),
  put: (endpoint, body, options) => requestWithJsonBody('PUT', endpoint, body, options),
  patch: (endpoint, body, options) => requestWithJsonBody('PATCH', endpoint, body, options),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' })
});

export const sessionStorage = Object.freeze({
  clear: clearSession,
  capture: captureSession,
  isCurrent: isCurrentSession,
  save: ({ accessToken, refreshToken, user }) => {
    sessionVersion++;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
});
