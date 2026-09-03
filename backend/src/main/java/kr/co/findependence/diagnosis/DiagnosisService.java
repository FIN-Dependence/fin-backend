package kr.co.findependence.diagnosis;

import kr.co.findependence.profile.ProfileEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DiagnosisService {
    public DiagnosisResponse diagnose(ProfileEntity p) {
        long inflow = value(p.getMonthlyIncome()) + (p.isFamilySupportEnds() ? 0 : value(p.getFamilySupport()));
        long required = value(p.getMonthlyRent()) + value(p.getMaintenance()) + value(p.getMonthlyUtilities())
                + value(p.getMonthlyFood()) + value(p.getMonthlyTransport()) + value(p.getMonthlyCommunication())
                + value(p.getInsurance()) + value(p.getDebtPayment()) + value(p.getCardPayment())
                + value(p.getOtherFixedCost());
        long balance = inflow - required;
        double emergencyMonths = required == 0 ? 0 : (double) value(p.getEmergencyFund()) / required;

        List<String> missing = new ArrayList<>();
        List<String> questions = new ArrayList<>();
        List<AdviceItem> advice = new ArrayList<>();

        if (!"확인 완료".equals(p.getUtilities())) {
            missing.add("관리비 포함 범위");
            questions.add("월 관리비에 수도·난방 등 어떤 항목이 포함되어 있나요?");
            advice.add(new AdviceItem("확인 필요", "관리비 포함 범위를 확인하세요",
                    "월 관리비 금액은 입력됐지만 어떤 항목이 포함되는지는 아직 확정되지 않았어요.",
                    "계약서나 관리비 고지서에서 포함 항목 확인"));
        }
        if (p.getMonthlyUtilities() == null) {
            missing.add("별도 공과금 월 예상액");
            questions.add("관리비에 포함되지 않는 전기·가스·수도·인터넷 비용은 월 얼마인가요?");
            advice.add(new AdviceItem("확인 필요", "별도 공과금 예상액을 입력하세요",
                    "관리비와 별도로 내는 공과금이 비어 있어 실제 월 주거비가 달라질 수 있어요.",
                    "별도 공과금 월 예상액 입력"));
        }
        if (p.getMonthlyFood() == null || p.getMonthlyTransport() == null || p.getMonthlyCommunication() == null) {
            missing.add("독립 후 기본 생활비");
            questions.add("식비·교통비·통신비 중 아직 확인하지 않은 월 비용이 있나요?");
            advice.add(new AdviceItem("확인 필요", "독립 후 생활비를 채워 주세요",
                    "식비·교통·통신은 월세 외에 반복되는 필수비용이라 월 잔액 계산에 필요해요.",
                    "최근 지출을 참고해 식비·교통비·통신비 입력"));
        }
        if (p.getInsurance() == null) {
            missing.add("독립 후 직접 납부할 보험료");
            questions.add("독립 후 본인이 직접 납부하게 되는 보험료가 있나요?");
            advice.add(new AdviceItem("확인 필요", "보험료 납부자를 확인하세요",
                    "현재 보장과 실제 납부자를 확인해야 월 필수지출을 정확히 계산할 수 있어요.",
                    "보험 앱에서 계약자·납부자·월 보험료 확인"));
        }
        if (p.getCardPayment() == null) {
            missing.add("미분류 카드·자동이체 비용");
            questions.add("이미 입력한 비용 외에 카드나 자동이체로 나가는 월 고정비가 있나요?");
        }
        if (p.getEmergencyFund() == null || emergencyMonths < 1) {
            advice.add(new AdviceItem("점검 권장", "예상치 못한 지출에 대비할 여유자금을 점검해 보세요",
                    "1개월분은 의무 기준이 아닌 참고선이며, 소득 안정성과 입주 초기비용에 따라 필요한 금액은 달라져요.",
                    "내 상황에 맞는 비상자금 목표액 설정"));
        }
        if (p.isFamilySupportEnds() && value(p.getFamilySupport()) > 0) {
            advice.add(new AdviceItem("주의", "독립과 함께 종료되는 가족 지원이 있어요",
                    "가족 지원을 제외한 본인 소득만으로 독립 후 예산을 다시 계산해야 해요.",
                    "지원 종료 시점을 반영해 예산 재계산"));
        }
        long initialCost = value(p.getMovingCost()) + value(p.getFurnishingCost());
        if (p.getMovingCost() == null || p.getFurnishingCost() == null) {
            missing.add("이사·가구 등 초기비용");
            questions.add("이사비와 입주 직후 필요한 가구·가전 비용을 각각 예상해 보셨나요?");
        } else if (initialCost > value(p.getEmergencyFund())) {
            advice.add(new AdviceItem("주의", "초기비용과 비상자금을 분리하세요",
                    "입주 초기비용이 현재 비상자금보다 커서 입주 뒤 안전자금이 남지 않을 수 있어요.",
                    "이사·가구 비용을 지급한 뒤 남는 비상자금 재계산"));
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
        completed += "확인 완료".equals(p.getUtilities()) ? 1 : 0;
        completed += p.getMonthlyUtilities() != null ? 1 : 0;
        completed += p.getMonthlyFood() != null ? 1 : 0;
        completed += p.getMonthlyTransport() != null ? 1 : 0;
        completed += p.getMonthlyCommunication() != null ? 1 : 0;
        completed += p.getInsurance() != null ? 1 : 0;
        completed += p.getDebtPayment() != null ? 1 : 0;
        completed += p.getEmergencyFund() != null ? 1 : 0;

        return new DiagnosisResponse(inflow, required, balance,
                Math.round(emergencyMonths * 10.0) / 10.0, Math.min(100, Math.round(completed / 14f * 100)),
                missing, questions, advice.stream().limit(3).toList());
    }

    private static long value(Long value) { return value == null ? 0 : value; }
    private static boolean present(String value) { return value != null && !value.isBlank(); }
}
