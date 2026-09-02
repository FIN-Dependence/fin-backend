package kr.co.findependence.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        @NotBlank @Size(max = 80) String environmentId,
        @NotBlank @Size(max = 1500) String message
) {}
