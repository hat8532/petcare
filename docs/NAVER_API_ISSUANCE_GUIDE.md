# 🔑 네이버 API 발급 및 연동 가이드 (Naver API Issuance Guide)

> **프로젝트**: PetCare (반려동물 질병 진단 및 헬스케어 웹 플랫폼)  
> **적용 기능**: 24시 응급 동물병원 지도 탐색, 실시간 수의학 뉴스/블로그 검색, 네이버 소셜 로그인  

---

## 📌 STEP 1. 네이버 개발자 센터 접속 및 로그인

1. 🌐 **네이버 개발자 센터** 접속: [https://developers.naver.com/](https://developers.naver.com/)
2. 우측 상단의 **[로그인]** 버튼을 눌러 본인의 네이버 계정으로 로그인합니다.

---

## 📌 STEP 2. 애플리케이션 등록 (API 키 발급)

1. 상단 메뉴에서 **[Application]** ➔ **[애플리케이션 등록]** 메뉴를 클릭합니다.
2. **약관 동의 및 본인 인증**: 최초 1회 휴대폰 본인 인증을 진행합니다.
3. **애플리케이션 정보 입력**:
   * **애플리케이션 이름**: `PetCare` (프로젝트명 입력)
   * **사용 API 선택** (필요한 API 모두 선택):
     - 🔍 **검색 (Search)**: 실시간 수의학 뉴스, 블로그, 장소 검색
     - 🔐 **네이버 아이디로 로그인**: 회원가입/소셜 로그인 (이름, 이메일, 프로필 사진 선택)
     - 🗺️ **지도 (Naver Maps / Maps API)** *(참고: 네이버 클라우드 플랫폼에서 선택 가능)*

4. **서비스 환경 설정 (Web)**:
   * **환경**: `WEB 설정` 선택
   * **서비스 URL**: `http://localhost:5173` (로컬 개발용)
   * **네이버 로그인 Callback URL**: `http://localhost:5173/login/callback` (로그인 기능 사용 시)

5. 하단의 **[등록하기]** 버튼을 클릭합니다.

---

## 📌 STEP 3. Client ID 및 Client Secret 확인

등록이 완료되면 **[Application] ➔ [내 애플리케이션]** 상세 페이지에서 아래 키 값을 확인할 수 있습니다:

```
Client ID     : [ 30자리 무작위 알파벳/숫자 조합 키 ]  (예: AbCdEfGhIjKlMnOpQrSt)
Client Secret : [ 10자리 무작위 비밀키 ]               (예: XyZ1234567)
```

> ⚠️ **주의사항**: `Client Secret`은 외부에 노출되면 안 되므로 Git 저장소에 커밋할 때 `.env` 파일에 보관하고 `.gitignore`에 등록해야 합니다.

---

## 📌 STEP 4. PetCare 프로젝트 적용 방법

### 1) 백엔드 (Spring Boot: `application.yml` 또는 `application.properties`)

```yaml
# application.yml
naver:
  api:
    client-id: YOUR_NAVER_CLIENT_ID_HERE
    client-secret: YOUR_NAVER_CLIENT_SECRET_HERE
```

### 2) 프론트엔드 (React Vite: `frontend/.env`)

```env
# frontend/.env
VITE_NAVER_CLIENT_ID=YOUR_NAVER_CLIENT_ID_HERE
```

---

## 💡 2025/2026 최신 정책: 네이버 지도 'Maps' 신규 상품 무료 이용 요금표

네이버 클라우드 플랫폼의 신규 **'Maps'** 상품은 대표 계정 1개에 한해 대규모 월간 무료 이용량을 공식 제공합니다:

| 서비스 구분 | 과금 기준 | 무료 이용량 (월간) | 초과 시 요금 | 비고 |
| :--- | :---: | :---: | :---: | :--- |
| **Dynamic Map (웹/앱 지도)** | 이용 횟수 | **월 6,000,000건 이하 무료** | 0.1원/건 | 대표 계정 1개 한정 |
| **Static Map (정적 지도 이미지)** | 이용 횟수 | **월 3,000,000건 이하 무료** | 2원/건 | 대표 계정 1개 한정 |
| **Geocoding (주소 ➔ 좌표 변환)** | 이용 횟수 | **월 3,000,000건 이하 무료** | 0.5원/건 | 대표 계정 1개 한정 |
| **Reverse Geocoding (좌표 ➔ 주소)** | 이용 횟수 | **월 3,000,000건 이하 무료** | 0.5원/건 | 대표 계정 1개 한정 |
| **Directions 5 (길찾기 5개 경유)** | 이용 횟수 | **월 60,000건 이하 무료** | 5원/건 | 대표 계정 1개 한정 |
| **Directions 15 (길찾기 15개 경유)**| 이용 횟수 | **월 3,000건 이하 무료** | 20원/건 | 대표 계정 1개 한정 |

> 📌 **결론**: **PetCare** 플랫폼과 같은 일반 웹 서비스나 개발/시연 프로젝트에서는 월 600만 건 이하이므로 **100% 비용 부담 없이 영구 무료로 사용**하실 수 있습니다!

---

### 🗺️ 신규 'Maps' (월 600만건 무료) 등록 방법:
1. 🌐 [네이버 클라우드 플랫폼 (ncloud.com)](https://www.ncloud.com/) 접속 및 로그인
2. 상단 **[Console]** ➔ **[Services]** ➔ **[Application Services]** ➔ **[Maps]** 선택 (AI NAVER API가 아닌 독립된 `Maps` 메뉴!)
3. **[Application 등록]** ➔ `Web Dynamic Map` 및 `Geocoding` 체크
4. 서비스 URL 입력: `http://localhost:5173`
5. 발급받은 **Client ID**를 프론트엔드 `index.html`에 추가하여 **무료 사용**:
   ```html
   <script type="text/javascript" src="https://oapi.map.me/openapi/v3/maps.js?ncpClientId=YOUR_MAPS_CLIENT_ID"></script>
   ```

---

## 🎁 100% 카드 등록 없는 무료 대안: 카카오 맵 (Kakao Maps API)

네이버 클라우드의 결제 수단 등록이 부담스러우실 경우, **카카오 맵 API**는 결제 카드 등록 없이 **일 300,000건 100% 무료**로 사용할 수 있습니다:

1. 🌐 [카카오 개발자 센터](https://developers.kakao.com/) 접속 ➔ 로그인
2. **[내 애플리케이션]** ➔ **[애플리케이션 추가하기]** (`PetCare` 입력)
3. **[플랫폼] ➔ [Web]** ➔ `http://localhost:5173` 등록
4. **[앱 키]** 중 **`JavaScript 키`** 복사 후 사용!
