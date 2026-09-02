# 🐾 PetCare (반려동물 AI 헬스케어 플랫폼) API 명세서
## REST API Endpoints Specification Document

---

## 📌 [도메인별 담당자 요약]
* **👤 태준 (User)**: 회원 & 인증, 반려동물 온보딩 & PHR 헬스 대시보드 (Auth, User & Pet API)
* **🤖 진한님**: AI 질병 진단 & 경과 관찰 타임라인 (AI Diagnosis & Timeline API)
* **📰 지호님**: 24시 응급 동물병원, 실시간 펫 뉴스, 커뮤니티 (Hospital, News & Community API)

---

## 1. 공통 API 응답 구조 (Common Response Wrapper)

```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": { ... }
}
```

---

## 2. 도메인별 REST API 명세 (Domain APIs)

### 2.1 회원 & 인증 (Auth & User API) — `[담당자: 👤 태준 (User)]`
| Method | Endpoint | 설명 | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/signup` | 이메일/비밀번호 회원가입 | Public |
| `POST` | `/api/v1/auth/login` | 이메일/비밀번호 로그인 (JWT 발급) | Public |
| `POST` | `/api/v1/auth/oauth/kakao` | 카카오 소셜 로그인 인가코드 검증 | Public |
| `POST` | `/api/v1/auth/oauth/google` | 구글 소셜 로그인 인가코드 검증 | Public |
| `POST` | `/api/v1/auth/refresh` | Refresh Token 기반 Access Token 갱신 | User |
| `GET` | `/api/v1/users/me` | 내 프로필 정보 조회 | User |
| `PUT` | `/api/v1/users/me` | 닉네임 및 프로필 이미지 수정 | User |
| `PUT` | `/api/v1/users/me/password` | 비밀번호 변경 | User |
| `DELETE` | `/api/v1/users/me` | 회원 탈퇴 | User |

---

### 2.2 반려동물 온보딩 & 관리 (Pet API) — `[담당자: 👤 태준 (User)]`
| Method | Endpoint | 설명 | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/pets/breeds` | 축종별 품종 마스터 데이터 자동완성 목록 조회 | Public |
| `POST` | `/api/v1/pets` | 신규 반려동물 등록 (Multipart Image + JSON) | User |
| `GET` | `/api/v1/pets` | 로그인 한 회원의 반려동물 목록 조회 (1:N) | User |
| `GET` | `/api/v1/pets/{petId}` | 특정 반려동물 상세 프로필 조회 | User |
| `PUT` | `/api/v1/pets/{petId}` | 반려동물 정보 수정 (체중, 중성화 여부 등) | User |
| `PUT` | `/api/v1/pets/{petId}/primary` | 대표 반려동물 지정 설정 | User |
| `DELETE` | `/api/v1/pets/{petId}` | 반려동물 프로필 삭제 | User |

---

### 2.3 AI 질병 진단 (AI Diagnosis API - Core) — `[담당자: 🤖 진한님]`
| Method | Endpoint | 설명 | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/diagnosis/symptoms` | 환부 카테고리별 동적 증상 체크박스 목록 조회 | Public |
| `POST` | `/api/v1/diagnosis` | **[핵심]** AI 질병 진단 요청 (환부 사진 + 증상 체크 + 자유 텍스트) | User |
| `GET` | `/api/v1/diagnosis/{diagnosisId}` | 생성된 AI 진단 결과 리포트 상세 조회 | User |
| `GET` | `/api/v1/pets/{petId}/diagnoses` | 특정 반려동물의 전체 AI 진단 히스토리 조회 | User |

#### 📥 AI 진단 요청 JSON 구조 예시 (`POST /api/v1/diagnosis`)
```json
{
  "petId": 1,
  "affectedArea": "SKIN",
  "symptoms": ["가려움/긁음", "탈모", "발적/각질"],
  "description": "3일 전부터 오른쪽 귀 뒤쪽을 자주 긁고 붉게 부어올랐습니다."
}
```

#### 📤 AI 진단 응답 JSON 구조 예시
```json
{
  "code": 200,
  "message": "SUCCESS",
  "data": {
    "diagnosisId": 108,
    "petName": "초코",
    "affectedArea": "SKIN",
    "riskLevel": "CAUTION",
    "visionTopDiseases": [
      { "diseaseName": "습진/농피증", "probability": 84.5 },
      { "diseaseName": "링웜 (곰팡이성)", "probability": 10.2 },
      { "diseaseName": "알레르기성 피부염", "probability": 5.3 }
    ],
    "ragReport": "환부 이미지 분석 결과 습진/농피증 가능성이 84.5%로 가장 높습니다. 하루 2회 소독 후 핥지 못하도록 넥카라를 착용시켜 주시고, 3일 뒤 경과를 관찰해 보세요.",
    "createdAt": "2026-08-06T13:28:00Z"
  }
}
```

---

### 2.4 경과 관찰 & 타임라인 (Timeline API - 추가기능 A) — `[담당자: 🤖 진한님]`
| Method | Endpoint | 설명 | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/timeline/{petId}` | 특정 반려동물의 환부별 경과 타임라인 목록 조회 | User |
| `POST` | `/api/v1/timeline/compare` | **Before/After 슬라이더** 경과 비교 등록 & Gemini AI 소견 생성 | User |
| `GET` | `/api/v1/timeline/compare/{compareId}` | 경과 비교 리포트 상세 조회 (호전/유지/악화 판단) | User |

---

### 2.5 24시 응급 동물병원 (Hospital & Map API) — `[담당자: 🏥 지호님]`
| Method | Endpoint | 설명 | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/hospitals` | 사용자 현재 위경도 기준 주변 동물병원 검색 (`lat`, `lng`, `radius`, `isEmergency24h`) | Public |
| `GET` | `/api/v1/hospitals/{hospitalId}` | 동물병원 상세 정보 및 전화번호/길안내 링크 조회 | Public |
| `POST` | `/api/v1/hospitals/{hospitalId}/bookmark` | 단골 동물병원 북마크 등록/해제 | User |
| `GET` | `/api/v1/hospitals/bookmarks` | 내가 북마크 한 단골 동물병원 목록 조회 | User |

---

### 2.6 실시간 펫 헬스 뉴스 (News API - 추가기능 B) — `[담당자: 📰 지호님]`
| Method | Endpoint | 설명 | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/news` | 6시간 캐싱된 최신 펫 헬스 뉴스 목록 조회 (메인 슬라이더) | Public |

---

### 2.7 선택적 커뮤니티 (Community API) — `[담당자: 💬 지호님]`
| Method | Endpoint | 설명 | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/posts` | 커뮤니티 게시글 목록 조회 (페이징 & 검색) | Public |
| `POST` | `/api/v1/posts` | 게시글 작성 (AI 진단 리포트 선택 첨부 가능) | User |
| `GET` | `/api/v1/posts/{postId}` | 게시글 상세 조회 (첨부된 AI 진단 카드 포함) | Public |
| `PUT` | `/api/v1/posts/{postId}` | 본인 게시글 수정 | User |
| `DELETE` | `/api/v1/posts/{postId}` | 본인 게시글 삭제 | User |
| `POST` | `/api/v1/posts/{postId}/likes` | 게시글 좋아요 토글 | User |
| `POST` | `/api/v1/posts/{postId}/comments` | 게시글 댓글 작성 | User |
| `DELETE` | `/api/v1/comments/{commentId}` | 본인 댓글 삭제 | User |

