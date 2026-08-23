package kr.co.findependence.diagnosis;

import java.util.List;

public record DiagnosisResponse(
        long monthlyInflow,
        long confirmedRequiredExpenses,
        long expectedBalance,
        double emergencyMonths,
        int completionPercent,
        List<String> missingItems,
        List<String> followUpQuestions,
        List<AdviceItem> advice
) {}
