package com.petcare.backend.domain.diagnosis;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record DiagnosisAnalyzeRequest(
        @NotNull @Positive Long petId,
        @Size(max = 100) String petName,
        @NotBlank @Size(max = 30) String petSpecies,
        @NotBlank
        @Pattern(regexp = "SKIN|EYE|EAR|MOUTH|PAW_LIMB|NOSE_RESPIRATORY|ABDOMEN|CUSTOM")
        String affectedArea,
        @Size(max = 100) String customAreaText,
        @NotEmpty List<@NotBlank @Size(max = 100) String> symptoms,
        @NotBlank @Size(max = 2000) String description,
        Map<String, Object> healthProfile
) {
    public DiagnosisAnalyzeRequest {
        petName = petName == null || petName.isBlank() ? "반려동물" : petName;
        customAreaText = customAreaText == null ? "" : customAreaText;
        healthProfile = healthProfile == null ? Map.of() : Map.copyOf(healthProfile);
    }
}
