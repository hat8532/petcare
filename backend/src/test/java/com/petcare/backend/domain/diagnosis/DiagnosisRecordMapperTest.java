package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "spring.profiles.include=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.url=jdbc:h2:mem:diagnosis-record-mapper-test;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.h2.console.enabled=false"
})
@Transactional
class DiagnosisRecordMapperTest {

    @Autowired
    private DiagnosisRecordMapper mapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void insertAndSelectUseCanonicalDiagnosisColumns() {
        jdbcTemplate.update("""
                INSERT INTO users (email, password, nickname)
                VALUES (?, ?, ?)
                """, "diagnosis-mapper@petcare.test", "test-password", "진단테스트");
        Long userId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = ?",
                Long.class,
                "diagnosis-mapper@petcare.test");

        jdbcTemplate.update("""
                INSERT INTO pets (user_id, name, species)
                VALUES (?, ?, ?)
                """, userId, "초코", "DOG");
        Long petId = jdbcTemplate.queryForObject(
                "SELECT id FROM pets WHERE user_id = ? AND name = ?",
                Long.class,
                userId,
                "초코");

        DiagnosisRecordDTO record = DiagnosisRecordDTO.builder()
                .userId(userId)
                .petId(petId)
                .affectedArea("SKIN")
                .symptomsJson("[\"가려움/긁음\"]")
                .description("붉은 부위를 계속 긁습니다.")
                .riskLevel("CAUTION")
                .riskLabel("주의 (CAUTION)")
                .imageUrl("00000000-0000-0000-0000-000000000001.png")
                .diseasesJson("[{\"diseaseName\":\"피부염\",\"probability\":86.4}]")
                .reportContent("관찰 후 증상이 지속되면 병원을 방문하세요.")
                .build();

        mapper.insert(record);
        DiagnosisRecordDTO saved = mapper.findByIdAndOwner(
                record.getId(), "diagnosis-mapper@petcare.test");

        assertThat(saved).isNotNull();
        assertThat(saved.getUserId()).isEqualTo(userId);
        assertThat(saved.getPetId()).isEqualTo(petId);
        assertThat(saved.getRiskLabel()).isEqualTo("주의 (CAUTION)");
        assertThat(saved.getImageUrl()).isEqualTo(record.getImageUrl());
        assertThat(saved.getSymptomsJson()).isEqualTo(record.getSymptomsJson());
        assertThat(saved.getDiseasesJson()).isEqualTo(record.getDiseasesJson());
        assertThat(saved.getReportContent()).isEqualTo(record.getReportContent());
        assertThat(saved.getCreatedAt()).isNotNull();

        assertThat(jdbcTemplate.queryForObject(
                "SELECT diseases_json IS NULL AND report_content IS NULL FROM diagnosis_records WHERE id = ?",
                Boolean.class,
                record.getId())).isTrue();

        jdbcTemplate.update("""
                INSERT INTO users (email, password, nickname)
                VALUES (?, ?, ?)
                """, "DIAGNOSIS-MAPPER@PETCARE.TEST", "attacker-password", "대소문자변형계정");
        Long attackerUserId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = ?",
                Long.class,
                "DIAGNOSIS-MAPPER@PETCARE.TEST");
        jdbcTemplate.update("""
                INSERT INTO diagnosis_records (user_id, pet_id, affected_area, risk_level)
                VALUES (?, ?, ?, ?)
                """, attackerUserId, petId, "SKIN", "CAUTION");
        Long mismatchedOwnerRecordId = jdbcTemplate.queryForObject(
                "SELECT MAX(id) FROM diagnosis_records WHERE user_id = ?",
                Long.class,
                attackerUserId);

        assertThat(mapper.findOwnedPet(petId, "DIAGNOSIS-MAPPER@PETCARE.TEST"))
                .isNull();
        assertThat(mapper.findByIdAndOwner(record.getId(), "DIAGNOSIS-MAPPER@PETCARE.TEST"))
                .isNull();
        assertThat(mapper.findByIdAndOwner(
                mismatchedOwnerRecordId, "diagnosis-mapper@petcare.test"))
                .isNull();
        assertThat(mapper.countByPetIdAndOwner(petId, "DIAGNOSIS-MAPPER@PETCARE.TEST"))
                .isZero();
        assertThat(mapper.countByPetIdAndOwner(petId, "diagnosis-mapper@petcare.test"))
                .isEqualTo(1);
        assertThat(mapper.findByPetIdAndOwner(
                petId, "diagnosis-mapper@petcare.test", 5, 0L))
                .extracting(DiagnosisRecordDTO::getId)
                .containsExactly(record.getId());
    }
}
