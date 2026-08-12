package com.petcare.backend.domain.user;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserAddressDTO {
    private Long id;
    private Long userId;
    private String addressName;
    private String recipientName;
    private String recipientPhone;
    private String zipCode;
    private String address;
    private String detailAddress;
    private Double latitude;
    private Double longitude;
    private Boolean isDefault;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
