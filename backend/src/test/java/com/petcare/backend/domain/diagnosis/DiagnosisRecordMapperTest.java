package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
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
                .petId(petId)
                .affectedArea("SKIN")
                .symptomsJson("[\"가려움/긁음\"]")
                .description("붉은 부위를 계속 긁습니다.")
                .riskLevel("CAUTION")
                .diseasesJson("[{\"diseaseName\":\"피부염\",\"probability\":86.4}]")
                .reportContent("관찰 후 증상이 지속되면 병원을 방문하세요.")
                .build();

        mapper.insert(record);
        DiagnosisRecordDTO saved = mapper.findById(record.getId());

        assertThat(saved).isNotNull();
        assertThat(saved.getPetId()).isEqualTo(petId);
        assertThat(saved.getSymptomsJson()).isEqualTo(record.getSymptomsJson());
        assertThat(saved.getDiseasesJson()).isEqualTo(record.getDiseasesJson());
        assertThat(saved.getReportContent()).isEqualTo(record.getReportContent());
        assertThat(saved.getCreatedAt()).isNotNull();

        assertThat(jdbcTemplate.queryForObject(
                "SELECT diseases_json IS NULL AND report_content IS NULL FROM diagnosis_records WHERE id = ?",
                Boolean.class,
                record.getId())).isTrue();
    }
}
