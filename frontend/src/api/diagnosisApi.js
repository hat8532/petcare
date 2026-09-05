/* =====================================================
   [이 파일의 4가지 역할]

   1. 진단 Endpoint 관리
   2. Request·Response Contract 설명
   3. 진단 입력·응답 검증
   4. 진단 API 함수 제공

   호출 흐름
   Component → diagnosisApi 함수 → httpClient
   → Backend → 응답 검증 → Component에 data 반환
   ===================================================== */

import { httpClient } from './common/httpClient';

/* ====================================================
   1. 진단 Endpoint 관리
   [코드 읽기] 진단 API 주소를 한곳에 모아 Component의 URL 중복을 막는다.
   ==================================================== */
export const DIAGNOSIS_ENDPOINTS = Object.freeze({
  symptoms: '/diagnosis/symptoms',
  // 전달받은 ID를 URL에 넣어 상세·이력 주소를 만든다.
  detail: (diagnosisId) => `/diagnosis/${diagnosisId}`,
  image: (diagnosisId) => `/diagnosis/${diagnosisId}/image`,
  historyByPet: (petId, page, size) => {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return `/pets/${petId}/diagnoses?${query}`;
  },
  create: '/diagnosis'
});

/* ====================================================
   2. Request·Response Contract 설명
   [코드 읽기] JSDoc으로 Frontend가 보내고 받을 데이터 구조를 표시한다.
   ==================================================== */
/**
 * 진단 실행 시 Frontend가 Backend로 보내는 Request Body다.
 * 대괄호가 있는 property는 선택값이다.
 *
 * @typedef {Object} DiagnosisAnalyzeRequest
 * @property {number} petId
 * @property {string} petName
 * @property {string} petSpecies
 * @property {string} affectedArea
 * @property {string[]} symptoms
 * @property {string} description
 * @property {string} [customAreaText]
 * @property {Object} [healthProfile]
 */

/**
 * Backend에서 받는 진단 기록 한 건의 Response 구조다.
 * `string|null`은 문자열이 오거나 값이 없을 수 있다는 의미다.
 *
 * @typedef {Object} DiagnosisRecord
 * @property {number} diagnosisId
 * @property {number} petId
 * @property {string} affectedArea
 * @property {string|null} imageUrl
 * @property {string|null} description
 * @property {string} riskLevel
 * @property {string} riskLabel
 * @property {{diseaseName: string, probability: number}[]} visionTopDiseases
 * @property {string|null} ragReport
 * @property {{sourceId: string, title: string, publisher: string, sourceUrl: string}[]} ragSources
 * @property {string} analysisMode
 * @property {string|null} model
 * @property {string|null} modelVersion
 * @property {string|null} failureCode
 * @property {string[]} limitations
 * @property {string|null} requestId
 * @property {string[]} riskReasons
 * @property {string[]} actionCodes
 * @property {string[]} actionGuidance
 * @property {string} createdAt
 */

/**
 * @typedef {Object} DiagnosisHistoryPage
 * @property {DiagnosisRecord[]} content
 * @property {number} page
 * @property {number} size
 * @property {number} totalElements
 * @property {number} totalPages
 */

// Gemini 전체 30초를 기다리는 Spring read 35초에 연결·저장·응답 여유를 둔다.
const ANALYSIS_TIMEOUT_MS = 45_000;

/* ====================================================
   3. 진단 입력·응답 검증
   [실행 흐름] 잘못된 ID와 실패한 업무 응답이 Component까지 성공으로 전달되지 않게 한다.
   ==================================================== */
/** HTTP는 성공했지만 진단 업무 상태가 실패한 경우를 표현한다. */
export class DiagnosisApiError extends Error {
  constructor(message, status, responseBody = null) {
    // [코드 읽기] super는 부모 클래스인 Error에 오류 메시지를 전달한다.
    super(message);
    this.name = 'DiagnosisApiError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

/**
 * URL에 넣을 ID가 1 이상의 정수인지 요청 전에 검사한다.
 * 잘못된 ID로 불필요한 Backend 요청을 보내는 것을 막는다.
 */
const requirePositiveId = (value, fieldName) => {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new TypeError(`${fieldName}는 1 이상의 정수여야 합니다.`);
  }

  return id;
};

/** httpClient가 HTTP 성공으로 반환한 Body의 진단 업무 상태를 검사한다. */
const requireSuccessfulDiagnosisResponse = (body) => {
  // [주의] HTTP 200이어도 Backend의 업무 상태가 SUCCESS가 아니면 성공 데이터로 사용하지 않는다.
  if (body?.code !== 200 || body?.message !== 'SUCCESS') {
    throw new DiagnosisApiError(
      body?.message || '진단 API가 성공하지 않은 응답을 반환했습니다.',
      200,
      body
    );
  }

  return body;
};

/* ====================================================
   4. 진단 API 함수 제공
   [실행 흐름] Component는 아래 함수만 호출하고, 성공하면 필요한 data를 바로 받는다.
   ==================================================== */
export const diagnosisApi = Object.freeze({
  /** 환부별 증상 선택지 전체를 조회한다. */
  getSymptoms: async () => {
    const body = await httpClient.get(DIAGNOSIS_ENDPOINTS.symptoms);
    const response = requireSuccessfulDiagnosisResponse(body);
    return response.data;
  },

  /** 진단 ID로 저장된 진단 결과 한 건을 조회한다. */
  getDiagnosis: async (diagnosisId) => {
    const id = requirePositiveId(diagnosisId, 'diagnosisId');
    const body = await httpClient.get(DIAGNOSIS_ENDPOINTS.detail(id));
    const response = requireSuccessfulDiagnosisResponse(body);
    return response.data;
  },

  /** 소유권이 확인된 진단 기록의 비공개 Image를 Blob으로 조회한다. */
  getDiagnosisImage: async (diagnosisId) => {
    const id = requirePositiveId(diagnosisId, 'diagnosisId');
    return httpClient.getBlob(DIAGNOSIS_ENDPOINTS.image(id));
  },

  /** 반려동물 ID에 속한 과거 진단 결과 목록을 조회한다. */
  getHistoryByPet: async (petId, page = 0, size = 5) => {
    const id = requirePositiveId(petId, 'petId');
    if (!Number.isInteger(page) || page < 0) {
      throw new TypeError('page는 0 이상의 정수여야 합니다.');
    }
    if (!Number.isInteger(size) || size < 1 || size > 20) {
      throw new TypeError('size는 1 이상 20 이하의 정수여야 합니다.');
    }

    const body = await httpClient.get(DIAGNOSIS_ENDPOINTS.historyByPet(id, page, size));
    const response = requireSuccessfulDiagnosisResponse(body);
    const data = response.data;

    // Backend paging 배포 전의 배열 응답도 읽을 수 있게 하되 Component에는 한 형식만 반환한다.
    if (Array.isArray(data)) {
      return {
        content: data,
        page: 0,
        size: data.length,
        totalElements: data.length,
        totalPages: data.length > 0 ? 1 : 0
      };
    }

    return {
      content: Array.isArray(data?.content) ? data.content : [],
      page: Number.isInteger(data?.page) ? data.page : page,
      size: Number.isInteger(data?.size) ? data.size : size,
      totalElements: Number.isInteger(data?.totalElements) ? data.totalElements : 0,
      totalPages: Number.isInteger(data?.totalPages) ? data.totalPages : 0
    };
  },

  /**
   * 입력한 증상 정보로 새 진단을 실행한다.
   * GET과 달리 JSON Request Body가 있으므로 Method와 Content-Type을 직접 지정한다.
   *
   * @param {DiagnosisAnalyzeRequest} request
   */
  analyze: async (request, imageFile) => {
    if (!(imageFile instanceof File)) {
      throw new TypeError('진단할 환부 Image File이 필요합니다.');
    }

    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(request)], { type: 'application/json' })
    );
    formData.append('image', imageFile, imageFile.name);

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), ANALYSIS_TIMEOUT_MS);

    try {
      const body = await httpClient.postForm(DIAGNOSIS_ENDPOINTS.create, formData, {
        signal: abortController.signal
      });
      const response = requireSuccessfulDiagnosisResponse(body);
      return response.data;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new DiagnosisApiError(
          '진단 분석 시간이 초과되었습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.',
          504
        );
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
});
