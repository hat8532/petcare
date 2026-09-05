"""평가 방향 안내용 진입점. 실제 학습·추론·성능 측정을 실행하지 않는다."""


def run_ablation_benchmark():
    print("PetCare 평가 계획 — 미측정 / NOT MEASURED")
    print("이 명령은 모델을 평가하지 않으며 정확도·속도 개선 결과를 제공하지 않습니다.")
    print("1. 사용 가능한 Dataset·License와 독립 Test Split을 확정합니다.")
    print("2. 같은 Test Split에서 Baseline과 후보 Model을 각각 평가합니다.")
    print("3. Accuracy·Macro F1·표본 수와 실행 환경을 함께 기록합니다.")
    print("4. RAG 검색 품질·Report 근거와 응답 시간은 분류 정확도와 별도로 평가합니다.")
    print("현재 UI의 성능 영역은 평가 방향을 설명하는 Prototype입니다.")


if __name__ == '__main__':
    run_ablation_benchmark()
