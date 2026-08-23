package kr.co.findependence.profile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ProfileRequest(
        @Size(max = 40) String name,
        @NotNull @Min(19) @Max(39) Integer age,
        @NotBlank @Size(max = 60) String employment,
        @NotNull @PositiveOrZero Long monthlyIncome,
        @NotBlank @Size(max = 30) String housingType,
        @PositiveOrZero Long deposit,
        @PositiveOrZero Long monthlyRent,
        @PositiveOrZero Long maintenance,
        @Size(max = 30) String utilities,
        @PositiveOrZero Long insurance,
        @PositiveOrZero Long debtPayment,
        @PositiveOrZero Long cardPayment,
        @PositiveOrZero Long emergencyFund,
        @PositiveOrZero Long familySupport,
        boolean familySupportEnds,
        LocalDate moveDate
) {}
