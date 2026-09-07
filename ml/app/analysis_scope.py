"""현재 등록·진단 메뉴의 범위. 소견 허용은 임상 성능 승인을 뜻하지 않는다."""

SPECIES = {
    "DOG": "개", "CAT": "고양이", "RABBIT": "토끼",
    "HAMSTER": "햄스터/소동물(세부 종 미확인)", "BIRD": "조류/앵무새",
    "OTHER": "파충류/기타(세부 종 미확인)",
}
AREAS = {
    "SKIN": "피부/털/깃털/비늘", "EYE": "눈", "EAR": "귀와 주변",
    "MOUTH": "구강/치아/부리", "PAW_LIMB": "발/다리/날개와 관절 주변",
    "NOSE_RESPIRATORY": "코/호흡기", "ABDOMEN": "배/소화기", "CUSTOM": "직접 입력 부위",
}
COMMON_FINDINGS = {"REDNESS", "SWELLING", "MOISTURE_OR_DISCHARGE", "WOUND_OR_EROSION", "COLOR_CHANGE"}
AREA_FINDINGS = {
    "SKIN": COMMON_FINDINGS | {"HAIR_LOSS", "FEATHER_CHANGE", "SCALING", "CRUSTING", "OTHER_VISIBLE_CHANGE"},
    "EYE": COMMON_FINDINGS | {"EYE_CLOUDING", "EYE_CLOSURE"},
    "EAR": COMMON_FINDINGS | {"CRUSTING", "VISIBLE_DEBRIS"},
    "MOUTH": COMMON_FINDINGS | {"ORAL_DEPOSIT", "BEAK_CHANGE"},
    "PAW_LIMB": COMMON_FINDINGS | {"LIMB_POSTURE_CHANGE", "NAIL_CHANGE"},
    "NOSE_RESPIRATORY": COMMON_FINDINGS,
    "ABDOMEN": COMMON_FINDINGS | {"ABDOMINAL_OUTLINE_CHANGE"},
}
AREA_FINDINGS["CUSTOM"] = set().union(*AREA_FINDINGS.values())

NO_VISIBLE_FINDINGS = "사진에서 명확히 구분할 수 있는 외형 소견을 확보하지 못했습니다. 이상이 없다는 뜻은 아닙니다."
INTERNAL_LIMITATION = "사진의 외형만으로 관절 내부·호흡 기능·소화기 등 내부 상태나 질환을 판정할 수 없습니다."
NO_MATCHED_EVIDENCE = "이 동물 분류·환부·입력 증상에 맞는 참고자료를 찾지 못해 근거 리포트 없이 관찰 소견만 제공합니다."


def finding_codes(species: str, area: str) -> set[str]:
    allowed = AREA_FINDINGS.get(area, set()).copy()
    if species not in {"DOG", "CAT", "RABBIT", "HAMSTER"}:
        allowed.discard("HAIR_LOSS")
    if species != "BIRD":
        allowed.discard("FEATHER_CHANGE")
    if species not in {"BIRD", "OTHER"}:
        allowed.discard("BEAK_CHANGE")
    return allowed
