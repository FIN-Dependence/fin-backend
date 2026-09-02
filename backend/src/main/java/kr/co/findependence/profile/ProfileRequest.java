package kr.co.findependence.profile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record ProfileRequest(
        @Size(max = 40) String title,
        @Size(max = 40) String name,
        @NotNull @Min(19) @Max(39) Integer age,
        @NotBlank @Pattern(regexp = "첫 취업 · 정규직|계약직|프리랜서|구직 중|대학생 · 대학원생") String employment,
        @NotNull @PositiveOrZero @Max(1000000000000L) Long monthlyIncome,
        @NotBlank @Pattern(regexp = "월세|전세|공공임대|기숙사|아직 미정") String housingType,
        @PositiveOrZero @Max(1000000000000L) Long deposit,
        @PositiveOrZero @Max(1000000000000L) Long monthlyRent,
        @PositiveOrZero @Max(1000000000000L) Long maintenance,
        @Pattern(regexp = "확인하지 못함|일부만 확인|확인 완료") String utilities,
        @PositiveOrZero @Max(1000000000000L) Long monthlyUtilities,
        @PositiveOrZero @Max(1000000000000L) Long monthlyFood,
        @PositiveOrZero @Max(1000000000000L) Long monthlyTransport,
        @PositiveOrZero @Max(1000000000000L) Long monthlyCommunication,
        @PositiveOrZero @Max(1000000000000L) Long insurance,
        @PositiveOrZero @Max(1000000000000L) Long debtPayment,
        @PositiveOrZero @Max(1000000000000L) Long cardPayment,
        @PositiveOrZero @Max(1000000000000L) Long otherFixedCost,
        @PositiveOrZero @Max(1000000000000L) Long emergencyFund,
        @PositiveOrZero @Max(1000000000000L) Long movingCost,
        @PositiveOrZero @Max(1000000000000L) Long furnishingCost,
        @PositiveOrZero @Max(1000000000000L) Long familySupport,
        boolean familySupportEnds,
        LocalDate moveDate
) {}
