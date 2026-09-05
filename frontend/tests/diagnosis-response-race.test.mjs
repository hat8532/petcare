// 실행: node --test tests/diagnosis-response-race.test.mjs
// Playwright가 별도 Runtime에 있으면 PLAYWRIGHT_MODULE(file URL), CHROME_EXECUTABLE을 지정한다.
// 실제 React DOM을 사용하며 모든 진단 API는 메모리 Mock이다. 앱/AI/DB 서버는 시작하지 않는다.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { before, after, test } from 'node:test';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const entry = `${root}tests/diagnosis-race-fixture.jsx`;
let server;
let browser;
let baseUrl;

before(async () => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  let apiMocked = false;
  const bundle = await build({
    configFile: false, root, logLevel: 'silent',
    define: { 'process.env.NODE_ENV': JSON.stringify('development') },
    plugins: [{
      name: 'diagnosis-race-fixture',
      enforce: 'pre',
      resolveId(source, importer) {
        if (source === entry) return entry;
        if (importer?.endsWith('/DiagnosisDropzone.jsx') && source === '../api/diagnosisApi') {
          apiMocked = true;
          return '\0diagnosis-mock';
        }
      },
      load(id) {
        if (id === '\0diagnosis-mock') return 'export const diagnosisApi = new Proxy({}, { get: (_, key) => (...args) => window.testApi[key](...args) });';
        if (id !== entry) return;
        return `
          import React, { useState } from 'react';
          import { createRoot } from 'react-dom/client';
          import DiagnosisDropzone from '../src/components/DiagnosisDropzone.jsx';
          window.requests = [];
          window.results = [];
          const pending = (kind, args) => new Promise((resolve, reject) => {
            window.requests.push({ kind, args, resolve, reject, settled: false });
          });
          window.testApi = {
            getSymptoms: async () => ({ SKIN: ['가려움/긁음'] }),
            getHistoryByPet: (...args) => pending('history', args),
            getDiagnosis: (...args) => pending('detail', args),
            analyze: (...args) => pending('analyze', args),
            getDiagnosisImage: async () => new Blob(['test'], { type: 'image/png' })
          };
          const pets = [{ id: 1, name: '테스트 Pet 1', species: 'DOG' },
                        { id: 2, name: '테스트 Pet 2', species: 'CAT' }];
          function Fixture() {
            const [pet, setPet] = useState(pets[0]);
            window.switchPet = id => setPet(pets.find(p => p.id === id));
            return React.createElement(DiagnosisDropzone, {
              key: pet.id, selectedPet: pet, pets, isAuthenticated: true,
              onSelectPet: setPet, onDiagnosisResult: result => window.results.push(result)
            });
          }
          const app = createRoot(document.getElementById('root'));
          window.unmountFixture = () => app.unmount();
          app.render(React.createElement(
            location.search ? React.StrictMode : React.Fragment, null, React.createElement(Fixture)
          ));
        `;
      }
    }],
    build: { write: false, minify: false, lib: { entry, formats: ['iife'], name: 'DiagnosisRaceFixture' } }
  });
  assert.equal(apiMocked, true, '실제 API 대신 Mock이 연결돼야 한다');
  const outputs = (Array.isArray(bundle) ? bundle : [bundle]).flatMap(item => item.output);
  const script = outputs.find(item => item.type === 'chunk').code;
  server = createServer((request, response) => {
    response.setHeader('Content-Type', request.url === '/fixture.js'
      ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
    response.end(request.url === '/fixture.js' ? script
      : '<div id="root"></div><script src="/fixture.js"></script>');
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {})
  });
});

after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

const record = (id, petId = 1, failureCode = null) => ({
  diagnosisId: id, petId, riskLevel: 'OBSERVATION', riskLabel: '관찰',
  affectedArea: 'SKIN', analysisMode: 'RULE_FALLBACK', ragReport: `테스트 결과 ${id}`,
  visionTopDiseases: [], failureCode, imageUrl: null, createdAt: '2026-09-05T12:00:00'
});
const history = (ids = [101, 102], page = 0) => ({
  content: ids.map(id => record(id)), page, totalElements: 10, totalPages: 2
});

async function openFixture(t, strict = false) {
  const page = await browser.newPage();
  page.setDefaultTimeout(3000);
  t.after(() => page.close());
  // 예상치 못한 외부 통신은 차단하고 실패로 남긴다.
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'Browser 오류·외부 요청이 없어야 한다'));
  await page.route('**/*', route => {
    if (route.request().url().startsWith(baseUrl)) return route.continue();
    errors.push('허용되지 않은 외부 요청');
    return route.abort();
  });
  await page.goto(`${baseUrl}/${strict ? '?strict' : ''}`);
  await page.waitForFunction(() => window.requests?.some(r => r.kind === 'history'));
  return page;
}

async function settle(page, kind, value, { index = 0, reject = false } = {}) {
  await page.evaluate(async ({ kind, value, index, reject }) => {
    const request = window.requests.filter(r => r.kind === kind && !r.settled)[index];
    if (!request) throw new Error('대기 중인 Mock 요청 없음: ' + kind);
    request.settled = true;
    if (reject) request.reject(new Error(value));
    else request.resolve(value);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }, { kind, value, index, reject });
}

async function runAnalysis(page) {
  await page.getByRole('button', { name: '+ 가려움/긁음', exact: true }).click();
  await page.locator('#diagnosis-image').setInputFiles({
    name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from('fixture')
  });
  await page.locator('#diagnosis-description').fill('회귀 검증용 입력입니다.');
  await page.getByRole('button', { name: /AI 질병 진단 실행하기/ }).click();
  await page.waitForFunction(() => window.requests.some(r => r.kind === 'analyze'));
}

const resultIds = page => page.evaluate(() => window.results.map(result => result.diagnosisId));
const detailButton = (page, id) => page.getByRole('button', { name: new RegExp('^#' + id + ' ·') });

test('Pet 전환 후 이전 생성 성공은 부모 결과·현재 이력을 바꾸지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await page.getByRole('button', { name: /테스트 Pet 2/ }).click();
  await settle(page, 'history', history([201]));
  await settle(page, 'analyze', record(103));
  assert.deepEqual(await resultIds(page), []);
  assert.deepEqual(await page.evaluate(() => window.requests.filter(r => r.kind === 'history').map(r => r.args[0])), [1, 2]);
});

test('화면 종료 후 이전 상세 성공은 부모 결과를 전달하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await page.evaluate(() => window.unmountFixture());
  await settle(page, 'detail', record(101));
  assert.deepEqual(await resultIds(page), []);
});

test('같은 Pet의 상세를 역순 완료해도 마지막 클릭 결과를 유지한다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await detailButton(page, 102).click();
  await settle(page, 'detail', record(102), { index: 1 });
  await settle(page, 'detail', record(101));
  assert.deepEqual(await resultIds(page), [102]);
  assert.equal(await detailButton(page, 102).getAttribute('aria-pressed'), 'true');
});

test('오래된 상세 실패가 새 성공 결과에 오류를 덧붙이지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await detailButton(page, 102).click();
  await settle(page, 'detail', record(102), { index: 1 });
  await settle(page, 'detail', '오래된 요청 실패', { reject: true });
  assert.equal(await page.getByText('오래된 요청 실패', { exact: true }).count(), 0);
});

test('생성 중 이력을 선택하면 이전 생성 응답·실패 Modal을 무시한다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await detailButton(page, 102).click();
  await settle(page, 'detail', record(102));
  await settle(page, 'analyze', '오래된 생성 실패', { reject: true });
  assert.deepEqual(await resultIds(page), [102]);
  assert.equal(await page.getByRole('alertdialog').count(), 0);
  assert.equal(await page.getByRole('button', { name: /AI 질병 진단 실행하기/ }).getAttribute('aria-busy'), 'false');
});

test('상세 조회 중 새 진단을 실행하면 이전 상세가 새 결과를 덮지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await runAnalysis(page);
  await settle(page, 'analyze', record(103));
  await settle(page, 'history', history([103]));
  await settle(page, 'detail', record(101));
  assert.deepEqual(await resultIds(page), [103]);
});

test('생성 뒤 목록 갱신 대기 중 이력을 선택해도 예전 실패 안내가 열리지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await settle(page, 'analyze', record(103, 1, 'INFERENCE_TIMEOUT'));
  await detailButton(page, 102).click();
  await settle(page, 'detail', record(102));
  await settle(page, 'history', history());
  assert.deepEqual(await resultIds(page), [103, 102]);
  assert.equal(await page.getByRole('alertdialog').count(), 0);
});

test('목록 페이지와 생성 후 갱신이 역순 완료돼도 최신 목록을 유지한다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await runAnalysis(page);
  await settle(page, 'analyze', record(103));
  await settle(page, 'history', history([103]), { index: 1 });
  await settle(page, 'history', history([99], 1));
  assert.equal(await detailButton(page, 103).count(), 1);
  assert.equal(await page.getByText('1 / 2 page', { exact: true }).count(), 1);
});

test('StrictMode 재실행의 예전 목록 finally가 새 Loading을 끄지 않는다', async t => {
  const page = await openFixture(t, true);
  await page.waitForFunction(() => window.requests.filter(r => r.kind === 'history').length === 2);
  await settle(page, 'history', '이전 목록 실패', { reject: true });
  assert.equal(await page.getByRole('button', { name: '불러오는 중…', exact: true }).isDisabled(), true);
  assert.equal(await page.getByText('이전 목록 실패', { exact: true }).count(), 0);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', record(101));
  assert.deepEqual(await resultIds(page), [101]);
});

test('예전 생성의 catch/finally가 새 생성의 Loading을 끄지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await detailButton(page, 102).click();
  await settle(page, 'detail', record(102));
  await page.getByRole('button', { name: /AI 질병 진단 실행하기/ }).click();
  await settle(page, 'analyze', '예전 생성 실패', { reject: true });
  assert.equal(await page.getByRole('button', { name: /Image와 증상 분석 중/ }).getAttribute('aria-busy'), 'true');
  assert.equal(await page.getByRole('alertdialog').count(), 0);
  await settle(page, 'analyze', record(104));
  await settle(page, 'history', history([104]));
  assert.deepEqual(await resultIds(page), [102, 104]);
});

test('현재 생성 요청의 실제 실패는 숨기지 않고 안내한다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await settle(page, 'analyze', '현재 요청 실패', { reject: true });
  assert.equal(await page.getByRole('alertdialog').count(), 1);
  assert.equal(await page.getByRole('alertdialog').getByText('현재 요청 실패', { exact: true }).count(), 1);
});

for (const [label, response] of [['다른 Pet', record(101, 2)], ['다른 이력 ID', record(999)]]) {
  test(`${label}의 상세 응답은 현재 결과로 사용하지 않는다`, async t => {
    const page = await openFixture(t);
    await settle(page, 'history', history());
    await detailButton(page, 101).click();
    await settle(page, 'detail', response);
    assert.deepEqual(await resultIds(page), []);
    assert.ok(await page.getByText('선택한 진단 이력과 응답이 일치하지 않습니다.', { exact: true }).count() > 0);
  });
}

test('다른 Pet의 생성 응답도 부모 결과로 전달하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await settle(page, 'analyze', record(103, 2));
  assert.deepEqual(await resultIds(page), []);
  assert.equal(await page.getByRole('alertdialog').getByText('선택한 반려동물의 진단 결과가 아닙니다.', { exact: true }).count(), 1);
});
