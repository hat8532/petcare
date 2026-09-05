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
  let hospitalApiMocked = false;
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
        if (importer?.endsWith('/CareFlowBranch.jsx') && source === '../api/hospitalApi') {
          hospitalApiMocked = true;
          return '\0hospital-mock';
        }
      },
      load(id) {
        if (id === '\0diagnosis-mock') return 'export const diagnosisApi = new Proxy({}, { get: (_, key) => (...args) => window.testApi[key](...args) });';
        if (id === '\0hospital-mock') return 'export const hospitalApi = { getNearbyHospitals: async () => { throw new Error("이 Test에서는 병원 조회를 실행하지 않습니다."); } };';
        if (id !== entry) return;
        return `
          import React, { useState } from 'react';
          import { createRoot } from 'react-dom/client';
          import DiagnosisDropzone from '../src/components/DiagnosisDropzone.jsx';
          import CareFlowBranch from '../src/components/CareFlowBranch.jsx';
          const params = new URLSearchParams(location.search);
          const withCareFlow = params.has('care');
          window.geolocationCalls = 0;
          Object.defineProperty(navigator, 'geolocation', { value: {
            getCurrentPosition: () => { window.geolocationCalls++; throw new Error('실제 위치 조회 금지'); }
          }});
          window.requests = [];
          window.results = [];
          window.objectUrls = [];
          const createObjectURL = URL.createObjectURL.bind(URL);
          const revokeObjectURL = URL.revokeObjectURL.bind(URL);
          URL.createObjectURL = blob => {
            const url = createObjectURL(blob);
            window.objectUrls.push({ url, diagnosisId: blob.fixtureDiagnosisId ?? null, revoked: false });
            return url;
          };
          URL.revokeObjectURL = url => {
            const entry = window.objectUrls.find(item => item.url === url);
            if (entry) entry.revoked = true;
            revokeObjectURL(url);
          };
          const pending = (kind, args) => new Promise((resolve, reject) => {
            window.requests.push({ kind, args, resolve, reject, settled: false });
          });
          window.testApi = {
            getSymptoms: async () => ({ SKIN: ['가려움/긁음'] }),
            getHistoryByPet: (...args) => pending('history', args),
            getDiagnosis: (...args) => pending('detail', args),
            analyze: (...args) => pending('analyze', args),
            getDiagnosisImage: (...args) => pending('image', args)
          };
          const pets = [{ id: 1, name: '테스트 Pet 1', species: 'DOG' },
                        { id: 2, name: '테스트 Pet 2', species: 'CAT' }];
          function Fixture() {
            const [pet, setPet] = useState(pets[0]);
            const [care, setCare] = useState({ result: null, requestId: 0, visible: true });
            window.updateCare = patch => setCare(current => ({ ...current, ...patch }));
            window.switchPet = id => setPet(pets.find(p => p.id === id));
            return React.createElement(React.Fragment, null, React.createElement(DiagnosisDropzone, {
              key: pet.id, selectedPet: pet, pets, isAuthenticated: true,
              onSelectPet: setPet, onDiagnosisResult: result => {
                window.results.push(result);
                if (withCareFlow) setCare(current => ({ ...current, result }));
              },
              onOpenCareFlow: result => setCare(current => ({ ...current, result, requestId: current.requestId + 1 }))
            }), withCareFlow && care.visible && React.createElement(CareFlowBranch, {
              diagnosisResult: care.result, lookupRequestId: care.requestId
            }));
          }
          const app = createRoot(document.getElementById('root'));
          window.unmountFixture = () => app.unmount();
          app.render(React.createElement(
            params.has('strict') ? React.StrictMode : React.Fragment, null, React.createElement(Fixture)
          ));
        `;
      }
    }],
    build: { write: false, minify: false, lib: { entry, formats: ['iife'], name: 'DiagnosisRaceFixture' } }
  });
  assert.equal(apiMocked, true, '실제 API 대신 Mock이 연결돼야 한다');
  assert.equal(hospitalApiMocked, true, '실제 병원 API 대신 Mock이 연결돼야 한다');
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

async function openFixture(t, strict = false, care = false) {
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
  const query = new URLSearchParams();
  if (strict) query.set('strict', '');
  if (care) query.set('care', '');
  await page.goto(`${baseUrl}/?${query}`);
  await page.waitForFunction(() => window.requests?.some(r => r.kind === 'history'));
  return page;
}

async function settle(page, kind, value, { index = 0, reject = false, status } = {}) {
  await page.waitForFunction(({ kind, index }) =>
    window.requests.filter(request => request.kind === kind && !request.settled)[index], { kind, index });
  await page.evaluate(async ({ kind, value, index, reject, status }) => {
    const request = window.requests.filter(r => r.kind === kind && !r.settled)[index];
    if (!request) throw new Error('대기 중인 Mock 요청 없음: ' + kind);
    request.settled = true;
    if (reject) request.reject(Object.assign(new Error(value), { status }));
    else if (kind === 'image') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      context.fillStyle = value % 2 ? '#059669' : '#2563eb';
      context.fillRect(0, 0, 1, 1);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      blob.fixtureDiagnosisId = value;
      request.resolve(blob);
    }
    else request.resolve(value);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }, { kind, value, index, reject, status });
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

const withImage = (id, imageUrl = `/api/v1/diagnosis/${id}/image`) => ({ ...record(id), imageUrl });
const resultImage = page => page.getByRole('img', { name: '테스트 Pet 1의 진단 환부', exact: true });
const imageEntries = page => page.evaluate(() => window.objectUrls.filter(item => item.diagnosisId !== null));

test('R04: 분석 중 사진을 변경해도 조회 대기/실패 결과에 입력 Preview를 쓰지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await page.locator('#diagnosis-image').setInputFiles({
    name: 'changed.png', mimeType: 'image/png', buffer: Buffer.from('changed fixture')
  });
  await settle(page, 'analyze', withImage(103));
  await settle(page, 'history', history([103]));
  assert.equal(await page.getByRole('img', { name: '선택한 환부', exact: true }).count(), 1);
  assert.equal(await resultImage(page).count(), 0, '결과 조회 대기에 새 입력 사진을 대신 표시하지 않는다');
  await settle(page, 'image', '사진 조회 실패', { reject: true });
  assert.equal(await resultImage(page).count(), 0);
  assert.equal(await page.getByText('사진 조회 실패', { exact: true }).count(), 1);
});

test('R04: 저장 사진이 없는 생성 결과에도 입력 Preview를 대신 표시하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await settle(page, 'analyze', record(103));
  await settle(page, 'history', history([103]));
  assert.equal(await resultImage(page).count(), 0);
  assert.equal(await page.evaluate(() => window.requests.filter(item => item.kind === 'image').length), 0);
});

test('R04: 새 이력 사진 대기/실패 동안 이전 결과 사진을 표시하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', withImage(101));
  await settle(page, 'image', 101);
  await resultImage(page).evaluate(image => image.decode());
  await detailButton(page, 102).click();
  await settle(page, 'detail', withImage(102));
  assert.equal(await resultImage(page).count(), 0);
  assert.ok((await imageEntries(page))[0].revoked);
  await settle(page, 'image', '새 이력 사진 조회 실패', { reject: true });
  assert.equal(await resultImage(page).count(), 0);
});

test('R04: 같은 진단 ID라도 Image Reference가 바뀌면 이전 사진을 표시하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', withImage(101, 'image-reference-a'));
  await settle(page, 'image', 101);
  await detailButton(page, 101).click();
  await settle(page, 'detail', withImage(101, 'image-reference-b'));
  assert.equal(await resultImage(page).count(), 0);
  await settle(page, 'image', 101);
  assert.equal(await resultImage(page).getAttribute('src'), (await imageEntries(page))[1].url);
});

test('R04: 저장 사진은 입력 제거와 분리하고 결과 전환/Unmount 때 해제한다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await settle(page, 'analyze', withImage(103));
  await settle(page, 'history', history());
  await settle(page, 'image', 103);
  const saved = (await imageEntries(page))[0];
  await page.getByRole('button', { name: '선택한 Image 제거', exact: true }).click();
  assert.equal(await resultImage(page).getAttribute('src'), saved.url);
  assert.equal((await imageEntries(page))[0].revoked, false);
  await detailButton(page, 102).click();
  await settle(page, 'detail', withImage(102));
  await settle(page, 'image', 102);
  assert.equal((await imageEntries(page))[0].revoked, true);
  assert.equal(await resultImage(page).getAttribute('src'), (await imageEntries(page))[1].url);
  await page.evaluate(() => window.unmountFixture());
  assert.ok((await imageEntries(page)).every(item => item.revoked));
});

test('R04: 이전 사진이 늦게 도착해도 현재 사진을 바꾸거나 URL을 만들지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', withImage(101));
  await detailButton(page, 102).click();
  await settle(page, 'detail', withImage(102));
  await settle(page, 'image', 102, { index: 1 });
  await settle(page, 'image', 101);
  const entries = await imageEntries(page);
  assert.deepEqual(entries.map(item => item.diagnosisId), [102]);
  assert.equal(await resultImage(page).getAttribute('src'), entries[0].url);
});

test('R04: 사진 조회 중 화면이 종료되면 늦은 Blob의 URL을 만들지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', withImage(101));
  await page.evaluate(() => window.unmountFixture());
  await settle(page, 'image', 101);
  assert.deepEqual(await imageEntries(page), []);
});

test('R04: A→B→A 이력 이동에서 이미 해제한 A 사진 URL을 재사용하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', withImage(101));
  await settle(page, 'image', 101);
  await detailButton(page, 102).click();
  await settle(page, 'detail', withImage(102));
  await detailButton(page, 101).click();
  await settle(page, 'detail', withImage(101));
  assert.equal((await imageEntries(page))[0].revoked, true);
  assert.equal(await resultImage(page).count(), 0);
  await settle(page, 'image', 101, { index: 1 });
  await settle(page, 'image', 102);
  assert.deepEqual((await imageEntries(page)).map(item => item.diagnosisId), [101, 101]);
  assert.equal(await resultImage(page).getAttribute('src'), (await imageEntries(page))[1].url);
});

const savedNotice = '입력 기반 Safety Triage 결과가 진단 이력에 저장되었습니다.';
const unknownSaveNotice = '진단 결과의 저장 여부를 확인하지 못했습니다. 진단 이력을 확인해 주세요.';

for (const status of [400, 401, 403, 500, 504, undefined]) {
  test(`R05: ${status ? 'HTTP ' + status : 'Network'} 실패는 저장을 단정하지 않고 기존 재시도 정책을 유지한다`, async t => {
    const page = await openFixture(t);
    await settle(page, 'history', history());
    await runAnalysis(page);
    await settle(page, 'analyze', '요청 실패', { reject: true, status });
    const dialog = page.getByRole('alertdialog');
    assert.equal(await dialog.getByText(/저장했습니다|저장되었습니다/).count(), 0);
    assert.ok((await dialog.textContent()).includes(unknownSaveNotice));
    assert.equal(await dialog.getByRole('button', { name: '다시 시도', exact: true }).count(), !status || status >= 500 ? 1 : 0);
    await dialog.getByRole('button', { name: '입력 화면으로 돌아가기', exact: true }).click();
    assert.equal(await dialog.count(), 0);
    assert.equal(await page.locator('#diagnosis-description').inputValue(), '회귀 검증용 입력입니다.');
    assert.equal(await page.locator('#diagnosis-image').evaluate(input => input.files[0].name), 'fixture.png');
    assert.deepEqual(await resultIds(page), []);
  });
}

for (const [code, canRetry] of [['INFERENCE_TIMEOUT', true], ['RAG_NO_EVIDENCE', false], ['PROVIDER_REJECTED', false]]) {
  test(`R05: 저장된 ${code} 결과는 재시도 가능 여부와 별개로 저장을 안내한다`, async t => {
    const page = await openFixture(t);
    await settle(page, 'history', history());
    await runAnalysis(page);
    await settle(page, 'analyze', record(103, 1, code));
    await settle(page, 'history', history([103]));
    const dialog = page.getByRole('alertdialog');
    assert.ok((await dialog.textContent()).includes(savedNotice));
    assert.ok(!(await dialog.textContent()).includes(unknownSaveNotice));
    assert.equal(await dialog.getByRole('button', { name: '다시 시도', exact: true }).count(), canRetry ? 1 : 0);
    if (code === 'PROVIDER_REJECTED') assert.ok((await dialog.textContent()).includes('새 Image를 선택'));
    await dialog.getByRole('button', { name: '결과 화면 확인', exact: true }).click();
    assert.deepEqual(await resultIds(page), [103]);
  });
}

test('R05: 입력 사진이 없는 저장 이력의 재시도 안내에도 해당 기록의 저장 근거를 전달한다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', record(101, 1, 'INFERENCE_TIMEOUT'));
  await page.getByRole('button', { name: '다시 시도 안내', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  assert.ok((await dialog.textContent()).includes(savedNotice));
  assert.equal(await dialog.getByRole('button', { name: '다시 시도', exact: true }).count(), 0);
  assert.equal(await dialog.getByRole('button', { name: '결과 화면 확인', exact: true }).count(), 1);
});

test('R05: 저장된 실패 결과에서 재시도한 요청이 거절되면 이전 저장 근거를 재사용하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await settle(page, 'analyze', record(103, 1, 'INFERENCE_TIMEOUT'));
  await settle(page, 'history', history([103]));
  await page.getByRole('alertdialog').getByRole('button', { name: '다시 시도', exact: true }).click();
  await settle(page, 'analyze', '재시도 거절', { reject: true, status: 403 });
  const dialog = page.getByRole('alertdialog');
  assert.equal(await dialog.getByText(/저장했습니다|저장되었습니다/).count(), 0);
  assert.ok((await dialog.textContent()).includes(unknownSaveNotice));
  assert.equal(await dialog.getByRole('button', { name: '다시 시도', exact: true }).count(), 0);
  assert.deepEqual(await resultIds(page), [103]);
});

test('R05: 유효한 진단 ID가 없는 분석 응답도 저장 완료로 안내하지 않는다', async t => {
  const page = await openFixture(t);
  await settle(page, 'history', history());
  await runAnalysis(page);
  await settle(page, 'analyze', record(0, 1, 'INFERENCE_TIMEOUT'));
  await settle(page, 'history', history());
  const dialog = page.getByRole('alertdialog');
  assert.equal(await dialog.getByText(/저장했습니다|저장되었습니다/).count(), 0);
  assert.ok((await dialog.textContent()).includes(unknownSaveNotice));
});

async function updateCare(page, patch) {
  await page.evaluate(async patch => {
    window.updateCare(patch);
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  }, patch);
  assert.equal(await page.evaluate(() => window.geolocationCalls), 0, 'Modal 개방만으로 위치를 조회하지 않는다');
}

const hospitalDialog = page => page.getByRole('dialog');
const closeHospital = page => hospitalDialog(page).getByRole('button', { name: '결과 계속 확인', exact: true }).click();

for (const strict of [false, true]) {
  test(`R06: ${strict ? 'StrictMode' : '일반'}에서 이전 요청은 결과 교체/재조회로 재실행하지 않고 새 클릭만 처리한다`, async t => {
    const page = await openFixture(t, strict, true);
    await updateCare(page, { result: record(101) });
    assert.equal(await hospitalDialog(page).count(), 0);
    await updateCare(page, { requestId: 1 });
    assert.equal(await hospitalDialog(page).count(), 1);
    await closeHospital(page);
    await updateCare(page, { result: record(102) });
    assert.equal(await hospitalDialog(page).count(), 0);
    await updateCare(page, { requestId: 2 });
    await closeHospital(page);
    await updateCare(page, { result: record(102) });
    assert.equal(await hospitalDialog(page).count(), 0, '같은 ID의 새 응답 객체도 과거 요청이 아니다');
    await updateCare(page, { requestId: 3, result: record(103) });
    assert.equal(await hospitalDialog(page).count(), 1, '새 결과와 새 클릭이 함께 와도 처리한다');
  });
}

test('R06: 결과가 없을 때 들어온 요청을 나중에 다른 Pet 결과에 재생하지 않는다', async t => {
  const page = await openFixture(t, false, true);
  await updateCare(page, { requestId: 1 });
  assert.equal(await hospitalDialog(page).count(), 0);
  await updateCare(page, { result: record(201, 2) });
  assert.equal(await hospitalDialog(page).count(), 0);
  await updateCare(page, { requestId: 2 });
  assert.equal(await hospitalDialog(page).count(), 1);
  await updateCare(page, { result: null });
  assert.equal(await hospitalDialog(page).count(), 0);
});

test('R06: 진단 탭 재Mount는 과거 클릭을 재생하지 않고 새 클릭은 열 수 있다', async t => {
  const page = await openFixture(t, true, true);
  await updateCare(page, { result: record(101), requestId: 1 });
  await closeHospital(page);
  await updateCare(page, { visible: false });
  await updateCare(page, { visible: true });
  assert.equal(await hospitalDialog(page).count(), 0);
  await updateCare(page, { requestId: 2 });
  assert.equal(await hospitalDialog(page).count(), 1);
});

test('R06: 새 응급 결과의 자동 경고·수동 재개방은 유지한다', async t => {
  const page = await openFixture(t, true, true);
  const emergency = id => ({ ...record(id), riskLevel: 'EMERGENCY', riskLabel: '응급' });
  await updateCare(page, { result: emergency(101) });
  assert.equal(await hospitalDialog(page).getByText('응급 위험 신호가 입력되었습니다.', { exact: true }).count(), 1);
  await closeHospital(page);
  await updateCare(page, { result: emergency(101) });
  assert.equal(await hospitalDialog(page).count(), 0);
  await page.getByRole('button', { name: '현재 위치로 응급 병원 조회', exact: true }).click();
  await closeHospital(page);
  await updateCare(page, { result: emergency(102) });
  assert.equal(await hospitalDialog(page).count(), 1);
  await page.keyboard.press('Escape');
  await updateCare(page, { result: record(103) });
  assert.equal(await hospitalDialog(page).count(), 0);
  assert.equal(await page.locator('#root').getAttribute('inert'), null);
});

test('R06: 이전 병원 클릭 뒤 새 분석 실패는 실패 Dialog만 열고 응급은 응급 Dialog만 연다', async t => {
  const page = await openFixture(t, false, true);
  await settle(page, 'history', history());
  await detailButton(page, 101).click();
  await settle(page, 'detail', record(101));
  await page.locator('#diagnosis-section').getByRole('button', { name: /현재 위치로 검증 병원 조회/ }).click();
  await closeHospital(page);
  await runAnalysis(page);
  await settle(page, 'analyze', record(103, 1, 'INFERENCE_TIMEOUT'));
  await settle(page, 'history', history([103]));
  assert.equal(await hospitalDialog(page).count(), 0);
  assert.equal(await page.getByRole('alertdialog').count(), 1);
  assert.equal(await page.locator('#root').getAttribute('inert'), '');
  await page.getByRole('alertdialog').getByRole('button', { name: '결과 화면 확인', exact: true }).click();
  assert.equal(await page.locator('#root').getAttribute('inert'), null);
  await page.getByRole('button', { name: /AI 질병 진단 실행하기/ }).click();
  await settle(page, 'analyze', { ...record(104, 1, 'INFERENCE_TIMEOUT'), riskLevel: 'EMERGENCY', riskLabel: '응급' });
  await settle(page, 'history', history([104]));
  assert.equal(await hospitalDialog(page).count(), 1);
  assert.equal(await page.getByRole('alertdialog').count(), 0);
  assert.equal(await page.evaluate(() => window.geolocationCalls), 0);
});
