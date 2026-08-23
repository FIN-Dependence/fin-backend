package kr.co.findependence.diagnosis;

import kr.co.findependence.profile.ProfileEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DiagnosisService {
    public DiagnosisResponse diagnose(ProfileEntity p) {
        long inflow = value(p.getMonthlyIncome()) + (p.isFamilySupportEnds() ? 0 : value(p.getFamilySupport()));
        long required = value(p.getMonthlyRent()) + value(p.getMaintenance()) + value(p.getInsurance())
                + value(p.getDebtPayment()) + value(p.getCardPayment());
        long balance = inflow - required;
        double emergencyMonths = required == 0 ? 0 : (double) value(p.getEmergencyFund()) / required;

        List<String> missing = new ArrayList<>();
        List<String> questions = new ArrayList<>();
        List<AdviceItem> advice = new ArrayList<>();

        if (!"확인 완료".equals(p.getUtilities())) {
            missing.add("관리비 포함 공과금");
            questions.add("관리비에 수도·난방이 포함되고 전기·가스·인터넷은 별도인가요?");
            advice.add(new AdviceItem("확인 필요", "관리비 포함 항목을 확인하세요",
                    "별도 공과금이 있으면 실제 월 주거비가 현재 계산보다 커질 수 있어요.",
                    "임대차 조건 또는 관리비 고지서 확인"));
        }
        if (p.getInsurance() == null) {
            missing.add("독립 후 직접 납부할 보험료");
            questions.add("독립 후 본인이 직접 납부하게 되는 보험료가 있나요?");
            advice.add(new AdviceItem("확인 필요", "보험료 납부자를 확인하세요",
                    "현재 보장과 실제 납부자를 확인해야 월 필수지출을 정확히 계산할 수 있어요.",
                    "보험 앱에서 계약자·납부자·월 보험료 확인"));
        }
        if (p.getCardPayment() == null) {
            missing.add("월 카드 결제 예정액");
            questions.add("최근 3개월 카드 결제액의 월평균은 얼마인가요?");
        }
        if (p.getEmergencyFund() == null || emergencyMonths < 1) {
            advice.add(new AdviceItem("주의", "비상자금이 필수지출 1개월분보다 적어요",
                    "입주 직후 예상하지 못한 지출이 생기면 월 잔액이 부족해질 수 있어요.",
                    "이사 초기비용과 별도로 비상자금 목표액 설정"));
        }
        if (p.isFamilySupportEnds() && value(p.getFamilySupport()) > 0) {
            advice.add(new AdviceItem("주의", "독립과 함께 종료되는 가족 지원이 있어요",
                    "가족 지원을 제외한 본인 소득만으로 독립 후 예산을 다시 계산해야 해요.",
                    "지원 종료 시점을 반영해 예산 재계산"));
        }
        if (advice.isEmpty()) {
            advice.add(new AdviceItem("양호", "핵심 금융정보가 입력되었어요",
                    "현재 확인된 항목에서는 큰 누락이 보이지 않아요.",
                    "이사비·가구·중개보수 등 초기비용 확인"));
        }

        int completed = 0;
        completed += p.getAge() != null ? 1 : 0;
        completed += present(p.getEmployment()) ? 1 : 0;
        completed += p.getMonthlyIncome() != null ? 1 : 0;
        completed += present(p.getHousingType()) ? 1 : 0;
        completed += p.getMonthlyRent() != null ? 1 : 0;
        completed += p.getMaintenance() != null ? 1 : 0;
        completed += present(p.getUtilities()) ? 1 : 0;
        completed += p.getInsurance() != null ? 1 : 0;
        completed += p.getDebtPayment() != null ? 1 : 0;
        completed += p.getEmergencyFund() != null ? 1 : 0;

        return new DiagnosisResponse(inflow, required, balance,
                Math.round(emergencyMonths * 10.0) / 10.0, completed * 10,
                missing, questions, advice.stream().limit(3).toList());
    }

    private static long value(Long value) { return value == null ? 0 : value; }
    private static boolean present(String value) { return value != null && !value.isBlank(); }
}
