# Vision Dataset 후보

## 결론

1순위 후보는 AI-Hub `반려동물 피부 질환 데이터` 1.3이다. 반려견·반려묘, 스마트폰·일반 Camera Image, 피부 소견 Label이 현재 P0와 가장 가깝다. 다만 내국인 신청과 이용정책 검토가 필요하므로 `DRAFT`로 유지한다.

## 후보 비교

### AI-Hub 반려동물 피부 질환 데이터

- Source: `https://aihub.or.kr/aihubdata/data/view.do?dataSetSn=561`
- Revision: 1.3, 2024-04-23
- 범위: 반려견 7종·반려묘 4종 피부질환, 10,000마리 이상, 전체 500,000장 이상
- Label: 구진/플라크, 비듬/각질/상피성잔고리, 태선화/과다색소침착, 농포/여드름, 미란/궤양, 결절/종괴, 무증상
- 장점: 현재 UI의 Smartphone 환부 Image와 가깝고 Dog·Cat을 모두 포함한다.
- Gate: 신청 자격, 이용정책, 재배포·Model Artifact 공개 허용, Pet Group Identifier 제공 여부 확인

### Mendeley Data 다중분광 반려견 피부 질환

- Source DOI: `10.17632/5dbht54kw7.1`
- License: CC BY 4.0
- 범위: 반려견 95마리, 세균성 23·진균성 19·과민성 알레르기 23·건강 30
- 장점: Pet 단위 수가 명시되고 소유자 서면 동의와 License가 명확하다.
- 한계: 다중분광 장비 Image라 Smartphone RGB 입력과 Domain이 다르며 Dog만 포함한다.

## 제외

- 출처·License·수의학 Label 검증이 불명한 재배포 Dataset
- 인간 피부질환 Dataset
- Histopathology·현미경 전용 Dataset
- 동일 Pet Group Identifier를 구성할 수 없는 Dataset

## 승인 전 금지

- Dataset 원본을 Git에 Commit하지 않는다.
- 이용정책 확인 전에 학습·평가·재배포하지 않는다.
- Disease Label과 Visual Finding Label을 같은 의미로 사용하지 않는다.
