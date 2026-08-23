package kr.co.findependence.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import kr.co.findependence.config.AppProperties;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Arrays;

@Service
public class RagContextService {
    public record RagHit(String text, String source, int score) {}

    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final List<RagHit> documents = new ArrayList<>();

    public RagContextService(AppProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void load() {
        if (!properties.rag().enabled() || properties.rag().dataPath() == null) return;
        Path path = Path.of(properties.rag().dataPath());
        if (!Files.isRegularFile(path)) return;
        try (var lines = Files.lines(path)) {
            lines.filter(line -> !line.isBlank()).forEach(line -> {
                try {
                    JsonNode node = objectMapper.readTree(line);
                    String text = first(node, "evidence_clean", "text", "content", "evidence");
                    String source = first(node, "source_file", "source", "document");
                    if (!text.isBlank()) documents.add(new RagHit(text, source, 0));
                } catch (Exception ignored) {
                    // 불완전한 한 줄 때문에 전체 RAG 로딩을 중단하지 않는다.
                }
            });
        } catch (IOException ignored) {
            // RAG 자료가 없어도 규칙 기반 상담은 계속 동작한다.
        }
    }

    public List<RagHit> search(String query) {
        if (documents.isEmpty()) return List.of();
        List<String> terms = Arrays.stream(query.toLowerCase(Locale.ROOT).split("\\s+"))
                .distinct().toList();
        return documents.stream()
                .map(doc -> new RagHit(doc.text(), doc.source(), terms.stream()
                        .mapToInt(term -> term.length() > 1 && doc.text().toLowerCase(Locale.ROOT).contains(term) ? 1 : 0)
                        .sum()))
                .filter(hit -> hit.score() > 0)
                .sorted(Comparator.comparingInt(RagHit::score).reversed())
                .limit(properties.rag().maxResults())
                .toList();
    }

    private static String first(JsonNode node, String... keys) {
        for (String key : keys) if (node.hasNonNull(key)) return node.get(key).asText("");
        return "";
    }
}
