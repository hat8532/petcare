package com.petcare.backend.domain.diagnosis.persistence;

public record DiagnosisPetContext(
        Long userId,
        Long petId,
        String petName,
        String petSpecies
) {
}
