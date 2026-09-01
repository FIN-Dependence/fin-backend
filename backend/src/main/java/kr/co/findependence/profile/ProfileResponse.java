package kr.co.findependence.profile;

import java.time.Instant;
import java.time.LocalDate;

public record ProfileResponse(
        String clientId,
        String name,
        Integer age,
        String employment,
        Long monthlyIncome,
        String housingType,
        Long deposit,
        Long monthlyRent,
        Long maintenance,
        String utilities,
        Long monthlyUtilities,
        Long monthlyFood,
        Long monthlyTransport,
        Long monthlyCommunication,
        Long insurance,
        Long debtPayment,
        Long cardPayment,
        Long otherFixedCost,
        Long emergencyFund,
        Long movingCost,
        Long furnishingCost,
        Long familySupport,
        boolean familySupportEnds,
        LocalDate moveDate,
        Instant updatedAt
) {
    public static ProfileResponse from(ProfileEntity p) {
        return new ProfileResponse(p.getClientId(), p.getName(), p.getAge(), p.getEmployment(),
                p.getMonthlyIncome(), p.getHousingType(), p.getDeposit(), p.getMonthlyRent(),
                p.getMaintenance(), p.getUtilities(), p.getMonthlyUtilities(), p.getMonthlyFood(),
                p.getMonthlyTransport(), p.getMonthlyCommunication(), p.getInsurance(), p.getDebtPayment(),
                p.getCardPayment(), p.getOtherFixedCost(), p.getEmergencyFund(), p.getMovingCost(),
                p.getFurnishingCost(), p.getFamilySupport(),
                p.isFamilySupportEnds(), p.getMoveDate(), p.getUpdatedAt());
    }
}
