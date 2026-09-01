package kr.co.findependence.chat;

import kr.co.findependence.diagnosis.DiagnosisResponse;
import kr.co.findependence.diagnosis.DiagnosisService;
import kr.co.findependence.profile.ProfileEntity;
import kr.co.findependence.profile.ProfileService;
import kr.co.findependence.rag.RagContextService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class ChatService {
    private final ProfileService profileService;
    private final DiagnosisService diagnosisService;
    private final ChatMessageRepository messageRepository;
    private final RagContextService ragContextService;
    private final LlmClient llmClient;

    public ChatService(ProfileService profileService, DiagnosisService diagnosisService,
                       ChatMessageRepository messageRepository, RagContextService ragContextService,
                       LlmClient llmClient) {
        this.profileService = profileService;
        this.diagnosisService = diagnosisService;
        this.messageRepository = messageRepository;
        this.ragContextService = ragContextService;
        this.llmClient = llmClient;
    }

    @Transactional
    public ChatResponse chat(String userId, ChatRequest request) {
        ProfileEntity profile = profileService.require(userId);
        DiagnosisResponse diagnosis = diagnosisService.diagnose(profile);
        List<RagContextService.RagHit> ragHits = ragContextService.search(request.message());
        List<RagContextService.RagHit> officialHits = ragHits.stream()
                .filter(hit -> "official".equals(hit.category())).toList();
        List<RagContextService.RagHit> dialogueHits = ragHits.stream()
                .filter(hit -> "dialogue".equals(hit.category())).toList();

        messageRepository.save(new ChatMessageEntity(userId, "user", request.message()));
        List<ChatMessageEntity> recent = new ArrayList<>(messageRepository
                .findTop10ByClientIdOrderByCreatedAtDesc(userId));
        Collections.reverse(recent);

        String answer = llmClient.complete(
                        systemPrompt(),
                        buildUserPrompt(profile, diagnosis, recent, officialHits, dialogueHits, request.message()))
                .orElseGet(() -> fallback(profile, diagnosis, request.message()));

        messageRepository.save(new ChatMessageEntity(userId, "assistant", answer));
        return new ChatResponse(answer, diagnosis.advice(),
                ragHits.stream().map(RagContextService.RagHit::source).filter(s -> !s.isBlank()).distinct().toList(),
                Instant.now());
    }

    public record HistoryMessage(String role, String text, Instant createdAt) {}

    @Transactional(readOnly = true)
    public List<HistoryMessage> history(String userId) {
        var messages = new ArrayList<>(messageRepository.findTop50ByClientIdOrderByCreatedAtDesc(userId));
        Collections.reverse(messages);
        return messages.stream().map(m -> new HistoryMessage(m.getRole(), m.getContent(), m.getCreatedAt())).toList();
    }

    private String systemPrompt() {
        return """
                당신은 첫 독립을 준비하는 한국 청년을 위한 금융자립 상담 AI다.
                확인된 사용자 정보, Java 계산 결과, 제공된 공식자료 근거만 사용한다.
                [상담 예시]는 참고용 대화 사례일 뿐 공식 근거가 아니다. 공식 근거인 것처럼 인용하지 않는다.
                확인되지 않은 금액을 0원으로 단정하지 말고 필요한 추가질문을 한다.
                통계 평균을 개인의 위험 기준으로 단정하지 않는다.
                답변은 쉬운 한국어로 핵심 진단, 근거, 다음 행동을 짧게 제시한다.
                금융상품 가입이나 투자 결정을 강요하지 않는다.
                """;
    }

    private String buildUserPrompt(ProfileEntity p, DiagnosisResponse d, List<ChatMessageEntity> recent,
                                   List<RagContextService.RagHit> officialHits,
                                   List<RagContextService.RagHit> dialogueHits, String question) {
        String history = recent.stream()
                .map(m -> m.getRole() + ": " + m.getContent())
                .collect(Collectors.joining("\n"));
        String official = officialHits.stream()
                .map(hit -> "- " + hit.text() + (hit.source().isBlank() ? "" : " (출처: " + hit.source() + ")"))
                .collect(Collectors.joining("\n"));
        String dialogue = dialogueHits.stream()
                .map(hit -> "- " + hit.text())
                .collect(Collectors.joining("\n"));
        return """
                [사용자 금융환경]
                이름=%s, 나이=%s, 취업=%s, 월소득=%s원, 월세=%s원, 관리비=%s원,
                별도공과금=%s원, 식비=%s원, 교통비=%s원, 통신비=%s원,
                보험료=%s원, 부채상환=%s원, 미분류 카드·자동이체=%s원, 기타고정비=%s원,
                비상자금=%s원, 이사비=%s원, 가구·가전비=%s원,
                가족지원=%s원, 독립 후 지원종료=%s, 관리비 확인=%s

                [확정 계산]
                월유입=%d원, 확인된 필수지출=%d원, 예상잔액=%d원, 비상자금=%.1f개월,
                미확인항목=%s, 추가질문=%s

                [최근 대화]
                %s

                [공식자료 검색 결과]
                %s

                [상담 예시 (참고용, 공식 근거 아님)]
                %s

                [현재 질문]
                %s
                """.formatted(text(p.getName()), text(p.getAge()), text(p.getEmployment()), text(p.getMonthlyIncome()),
                text(p.getMonthlyRent()), text(p.getMaintenance()), text(p.getMonthlyUtilities()), text(p.getMonthlyFood()),
                text(p.getMonthlyTransport()), text(p.getMonthlyCommunication()), text(p.getInsurance()), text(p.getDebtPayment()),
                text(p.getCardPayment()), text(p.getOtherFixedCost()), text(p.getEmergencyFund()), text(p.getMovingCost()),
                text(p.getFurnishingCost()), text(p.getFamilySupport()), p.isFamilySupportEnds(),
                text(p.getUtilities()), d.monthlyInflow(), d.confirmedRequiredExpenses(), d.expectedBalance(),
                d.emergencyMonths(), d.missingItems(), d.followUpQuestions(), history,
                official.isBlank() ? "검색된 자료 없음" : official,
                dialogue.isBlank() ? "검색된 상담 예시 없음" : dialogue,
                question);
    }

    private String fallback(ProfileEntity p, DiagnosisResponse d, String question) {
        String q = question.toLowerCase(Locale.ROOT);
        String name = p.getName() == null || p.getName().isBlank() ? "사용자" : p.getName();
        if (q.matches(".*(가능|괜찮|살 수|독립).*") ) {
            return "%s님의 확인된 월 유입은 %s원, 필수지출은 %s원이며 현재 예상 잔액은 %s원입니다. 다만 다음 항목이 아직 빠져 있을 수 있어 이 금액을 최종 여유자금으로 단정할 수는 없어요: %s."
                    .formatted(name, won(d.monthlyInflow()), won(d.confirmedRequiredExpenses()),
                            won(d.expectedBalance()), String.join("·", d.missingItems()));
        }
        if (q.matches(".*(비상|저축|여유).*") ) {
            return "현재 비상자금은 확인된 필수지출의 약 %.1f개월분입니다. 이사비와 생활용품처럼 한 번만 발생하는 비용을 제외한 뒤 비상자금을 다시 확인하세요."
                    .formatted(d.emergencyMonths());
        }
        if (q.matches(".*(주거|월세|관리비|공과금).*") ) {
            return "현재 월세와 관리비 합계는 %s원입니다. 관리비 포함 항목과 별도 전기·가스·인터넷 비용을 확인하면 실제 주거비를 더 정확하게 계산할 수 있어요."
                    .formatted(won(value(p.getMonthlyRent()) + value(p.getMaintenance())));
        }
        if (!d.followUpQuestions().isEmpty()) {
            return "정확한 진단을 위해 먼저 확인할게요. " + d.followUpQuestions().get(0);
        }
        return "저장된 금융환경을 기준으로 확인했습니다. 현재 예상 월 잔액은 " + won(d.expectedBalance())
                + "원이며, 이사 초기비용은 별도로 점검하는 것이 좋아요.";
    }

    private static long value(Long value) { return value == null ? 0 : value; }
    private static String text(Object value) { return value == null ? "미확인" : value.toString(); }
    private static String won(long value) { return String.format("%,d", value); }
}
