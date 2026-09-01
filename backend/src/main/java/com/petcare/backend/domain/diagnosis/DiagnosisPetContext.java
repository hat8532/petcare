package com.petcare.backend.domain.diagnosis;

public record DiagnosisPetContext(
        Long userId,
        Long petId,
        String petName,
        String petSpecies
) {
}
