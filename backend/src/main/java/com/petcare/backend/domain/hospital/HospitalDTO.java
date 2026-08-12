package com.petcare.backend.domain.hospital;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HospitalDTO {
    private Long id;
    private String name;
    private String phone;
    private String address;
    private String detailAddress;
    private Double latitude;
    private Double longitude;
    private Boolean isEmergency24h;
    private String businessHours;
    private BigDecimal rating;
    private Integer reviewCount;
    private String naverPlaceUrl;
    private Boolean isActive;
    private Double distance; // Calculated distance in km
}
