package com.petcare.backend.domain.pet;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PetDTO {
    private Long id;
    private Long userId;
    private String name;
    private String species;
    private String breed;
    private String age;
    private String weight;
    private String icon;
    private String profileImageUrl;
}
