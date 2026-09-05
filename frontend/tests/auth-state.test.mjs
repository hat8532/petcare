// 실행: node --test tests/auth-state.test.mjs
// PLAYWRIGHT_MODULE(file URL)·CHROME_EXECUTABLE 지정 가능. 실제 App/API + Mock Fetch/관찰용 자식 Component.
// 실제 앱 서버·계정·AI·DB는 사용하지 않는다.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const entry = resolve(root, 'tests/auth-state-observer.jsx');
let server, browser, baseUrl;

before(async () => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const bundle = await build({
    configFile: false, root, logLevel: 'silent',
    define: {
      'process.env.NODE_ENV': JSON.stringify('development'),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1')
    },
    plugins: [{
      name: 'auth-state-observer', enforce: 'pre',
      resolveId(source, importer) {
        if (source === entry) return entry;
        if (importer?.endsWith('/src/App.jsx') && source.startsWith('./components/')) {
          return '\0observer:' + source.split('/').at(-1);
        }
      },
      load(id) {
        if (id.startsWith('\0observer:')) {
          const name = id.split(':')[1];
          return `import React from 'react';
            export default function Observer(props) {
              window.observed[${JSON.stringify(name)}] = props;
              return React.createElement('pre', { 'data-observer': ${JSON.stringify(name)} },
                JSON.stringify(props));
            }`;
        }
        if (id !== entry) return;
        return String.raw`
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import App from '../src/App.jsx';
          import { httpClient } from '../src/api/common/httpClient.js';
          window.observed = {};
          window.pendingPets = [];
          window.pendingHttp = [];
          window.httpResults = {};
          window.fetchCalls = [];
          window.expiredEvents = 0;
          window.refreshSucceeds = false;
          window.addEventListener('petcare:auth-expired', () => window.expiredEvents++);
          const json = (body, status = 200) => new Response(JSON.stringify(body), {
            status, headers: { 'Content-Type': 'application/json' }
          });
          const pending = path => new Promise((resolve, reject) => window.pendingHttp.push({
            path, settle: (body, status) => resolve(json(body, status)), reject
          }));
          window.fetch = async url => {
            const path = new URL(url, location.href).pathname;
            window.fetchCalls.push(path);
            if (/^\/api\/v1\/pets\/user\/\d+$/.test(path)) {
              return new Promise(resolve => window.pendingPets.push({
                path, settle: (data, status = 200) => resolve(json({ data }, status))
              }));
            }
            if (path === '/api/v1/fixture-controlled') return pending(path);
            if (path === '/api/v1/auth/refresh') {
              if (window.deferRefresh) return pending(path);
              return window.refreshSucceeds
                ? json({ accessToken: 'fixture-refreshed-token' })
                : json({ message: 'fixture refresh rejected' }, 401);
            }
            if (path === '/api/v1/fixture-unauthorized') return json({ message: 'fixture denied' }, 401);
            throw new Error('예상하지 않은 Fetch: ' + path);
          };
          localStorage.setItem('petcare_user', JSON.stringify({ id: 1, name: 'Fixture User A' }));
          localStorage.setItem('petcare_token', 'fixture-access-token');
          localStorage.setItem('petcare_refresh_token', 'fixture-refresh-token');
          window.triggerUnauthorized = async () => {
            try { await httpClient.get('/fixture-unauthorized'); }
            catch (error) { return error.status; }
          };
          window.startRequest = (key, options) => {
            httpClient.get('/fixture-controlled', options).then(
              data => { window.httpResults[key] = { status: 200, data }; },
              error => { window.httpResults[key] = { status: error.status ?? null }; }
            );
          };
          const app = createRoot(document.getElementById('root'));
          window.unmountApp = () => app.unmount();
          app.render(React.createElement(
            new URLSearchParams(location.search).has('strict') ? React.StrictMode : React.Fragment,
            null, React.createElement(App)
          ));
        `;
      }
    }],
    build: { write: false, minify: false, lib: { entry, formats: ['iife'], name: 'AuthStateObserver' } }
  });
  const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(item => item.output);
  const code = outputs.find(item => item.type === 'chunk').code;
  server = createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/fixture.js' ? 'text/javascript' : 'text/html');
    response.end(request.url === '/fixture.js' ? code : '<div id="root"></div><script src="/fixture.js"></script>');
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXECUTABLE });
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function open(t, strict = false) {
  const page = await browser.newPage();
  page.setDefaultTimeout(3000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (route.request().url().startsWith(baseUrl)) return route.continue();
    errors.push('외부 요청 차단');
    return route.abort();
  });
  t.after(async () => { await page.close(); assert.deepEqual(errors, []); });
  await page.goto(baseUrl + (strict ? '/?strict' : '/'));
  await page.waitForFunction(count => window.pendingPets.length === count, strict ? 2 : 1);
  await page.evaluate(() => window.observed.Navbar.setActiveTab('diagnosis'));
  await page.waitForFunction(() => window.observed.DiagnosisDropzone);
  return page;
}
const flush = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const pet = id => ({ id, name: `Fixture Pet ${id}`, species: 'DOG' });
async function settle(page, index, data) {
  await page.evaluate(({ index, data }) => window.pendingPets[index].settle(data), { index, data });
  await flush(page);
}
const state = page => page.evaluate(() => ({
  userId: window.observed.Navbar.user?.id ?? null,
  pets: window.observed.DiagnosisDropzone.pets.map(pet => pet.id),
  selectedPetId: window.observed.DiagnosisDropzone.selectedPet?.id ?? null,
  authenticated: window.observed.DiagnosisDropzone.isAuthenticated,
  diagnosis: window.observed.CareFlowBranch.diagnosisResult,
  storageCleared: ['petcare_user', 'petcare_token', 'petcare_refresh_token'].every(key => localStorage.getItem(key) === null),
  expiredEvents: window.expiredEvents
}));
async function expire(page) {
  assert.equal(await page.evaluate(() => window.triggerUnauthorized()), 401);
  await flush(page);
}

async function settleHttp(page, index, body, status = 200, reject = false) {
  await page.waitForFunction(index => window.pendingHttp[index], index);
  await page.evaluate(({ index, body, status, reject }) => {
    if (reject) window.pendingHttp[index].reject(new TypeError('fixture network failure'));
    else window.pendingHttp[index].settle(body, status);
  }, { index, body, status, reject });
  await flush(page);
}
async function httpResult(page, key = 'request') {
  await page.waitForFunction(key => window.httpResults[key], key);
  return page.evaluate(key => window.httpResults[key], key);
}

test('갱신 실패: 기존 Pet·진단·저장된 세션을 정리한다', async t => {
  const page = await open(t);
  await settle(page, 0, [pet(101)]);
  await page.evaluate(() => window.observed.DiagnosisDropzone.onDiagnosisResult({ diagnosisId: 901 }));
  await flush(page);
  assert.equal((await state(page)).diagnosis.diagnosisId, 901);
  await expire(page);
  assert.deepEqual(await state(page), { userId: null, pets: [], selectedPetId: null, authenticated: false, diagnosis: null, storageCleared: true, expiredEvents: 1 });
});
test('Refresh Token 없음: 만료 이벤트로 App 상태를 정리한다', async t => {
  const page = await open(t);
  await settle(page, 0, [pet(101)]);
  await page.evaluate(() => localStorage.removeItem('petcare_refresh_token'));
  await expire(page);
  assert.equal((await state(page)).storageCleared, true);
  assert.equal((await state(page)).selectedPetId, null);
});
test('만료 전 Pet 조회가 뒤늦게 끝나도 이전 Pet을 복구하지 않아야 한다', async t => {
  const page = await open(t);
  await expire(page);
  assert.equal((await state(page)).userId, null);
  await settle(page, 0, [pet(101)]);
  const actual = await state(page);
  assert.deepEqual(actual.pets, []);
});
test('계정 B로 변경 후 도착한 계정 A Pet 응답을 무시해야 한다', async t => {
  const page = await open(t);
  await page.evaluate(() => window.observed.Navbar.onUserChange({ id: 2, name: 'Fixture User B' }));
  await page.waitForFunction(() => window.pendingPets.length === 2);
  await settle(page, 1, [pet(202)]);
  assert.equal((await state(page)).selectedPetId, 202);
  await settle(page, 0, [pet(101)]);
  const actual = await state(page);
  assert.equal(actual.userId, 2);
  assert.equal(actual.selectedPetId, 202);
});
test('Token 갱신 후 재요청도 401이면 사용 중인 세션을 정리해야 한다', async t => {
  const page = await open(t);
  await settle(page, 0, [pet(101)]);
  await page.evaluate(() => { window.refreshSucceeds = true; });
  await expire(page);
  const actual = await state(page);
  assert.equal(actual.userId, null);
  assert.equal(actual.storageCleared, true);
});

test('StrictMode의 정리된 첫 Pet 조회는 현재 선택을 덮어쓰지 않는다', async t => {
  const page = await open(t, true);
  await settle(page, 1, [pet(202)]);
  await settle(page, 0, [pet(101)]);
  assert.equal((await state(page)).selectedPetId, 202);
});

test('동일 User ID의 새 실행도 이전 Pet 조회를 무효화한다', async t => {
  const page = await open(t);
  await page.evaluate(() => window.observed.Navbar.onUserChange({ id: 1, name: 'Fixture Updated User' }));
  await page.waitForFunction(() => window.pendingPets.length === 2);
  await settle(page, 1, [pet(202)]);
  await settle(page, 0, [pet(101)]);
  assert.equal((await state(page)).selectedPetId, 202);
});

test('이전 계정 Pet 조회의 늦은 오류도 현재 목록을 비우지 않는다', async t => {
  const page = await open(t);
  await page.evaluate(() => window.observed.Navbar.onUserChange({ id: 2, name: 'Fixture User B' }));
  await page.waitForFunction(() => window.pendingPets.length === 2);
  await settle(page, 1, [pet(202)]);
  await page.evaluate(() => window.pendingPets[0].settle(null, 500));
  await flush(page);
  assert.equal((await state(page)).selectedPetId, 202);
});

test('App Unmount 후 Pet 응답으로 화면을 다시 만들지 않는다', async t => {
  const page = await open(t);
  await page.evaluate(() => window.unmountApp());
  await settle(page, 0, [pet(101)]);
  assert.equal(await page.locator('#root').innerHTML(), '');
});

for (const [name, status, options, reject] of [
  ['공개 요청의 401', 401, { auth: false }, false],
  ['권한 부족 403', 403, {}, false],
  ['서버 오류 500', 500, {}, false],
  ['네트워크 실패', null, {}, true]
]) {
  test(name + '는 로그인 세션을 종료하지 않는다', async t => {
    const page = await open(t);
    await settle(page, 0, [pet(101)]);
    await page.evaluate(options => window.startRequest('request', options), options);
    await settleHttp(page, 0, {}, status, reject);
    assert.equal((await httpResult(page)).status, status);
    const actual = await state(page);
    assert.equal(actual.userId, 1);
    assert.equal(actual.expiredEvents, 0);
    assert.equal(actual.storageCleared, false);
    assert.equal(await page.evaluate(() => window.fetchCalls.filter(path => path.endsWith('/auth/refresh')).length), 0);
  });
}

test('동시 401은 갱신을 공유하고 재요청 성공 시 세션을 유지한다', async t => {
  const page = await open(t);
  await settle(page, 0, [pet(101)]);
  await page.evaluate(() => {
    window.deferRefresh = true;
    window.startRequest('a');
    window.startRequest('b');
  });
  await settleHttp(page, 0, {}, 401);
  await settleHttp(page, 1, {}, 401);
  assert.equal(await page.evaluate(() => window.fetchCalls.filter(path => path.endsWith('/auth/refresh')).length), 1);
  await settleHttp(page, 2, { accessToken: 'fixture-refreshed-token' });
  await settleHttp(page, 3, { value: 'a' });
  await settleHttp(page, 4, { value: 'b' });
  assert.deepEqual(await httpResult(page, 'a'), { status: 200, data: { value: 'a' } });
  assert.deepEqual(await httpResult(page, 'b'), { status: 200, data: { value: 'b' } });
  assert.equal((await state(page)).expiredEvents, 0);
});

test('재요청의 늦은 401이 다른 Login Token을 지우지 않는다', async t => {
  const page = await open(t);
  await settle(page, 0, [pet(101)]);
  await page.evaluate(() => { window.refreshSucceeds = true; window.startRequest('request'); });
  await settleHttp(page, 0, {}, 401);
  await page.waitForFunction(() => window.pendingHttp.length === 2);
  await page.evaluate(() => {
    localStorage.setItem('petcare_token', 'fixture-user-b-token');
    localStorage.setItem('petcare_refresh_token', 'fixture-user-b-refresh');
    localStorage.setItem('petcare_user', JSON.stringify({ id: 2 }));
    window.observed.Navbar.onUserChange({ id: 2 });
  });
  await settleHttp(page, 1, {}, 401);
  assert.equal((await httpResult(page)).status, 401);
  assert.equal((await state(page)).userId, 2);
  assert.equal((await state(page)).expiredEvents, 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('petcare_token') === 'fixture-user-b-token'), true);
});
