package kr.co.findependence.rag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.findependence.config.AppProperties;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class RagContextService {
    public record RagHit(String documentId, String category, String text, String source,
                          String sourceUrl, String page, double distance) {}

    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public RagContextService(AppProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public List<RagHit> search(String query) {
        if (!properties.rag().enabled()
                || properties.rag().searchUrl() == null
                || properties.rag().searchUrl().isBlank()) {
            return List.of();
        }
        try {
            String body = objectMapper.writeValueAsString(Map.of("question", query));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(stripSlash(properties.rag().searchUrl()) + "/search"))
                    .timeout(Duration.ofMillis(properties.rag().timeoutMs()))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) return List.of();

            JsonNode root = objectMapper.readTree(response.body());
            List<RagHit> hits = new ArrayList<>();
            addHits(hits, root.path("official_evidence"), "official");
            addHits(hits, root.path("dialogue_examples"), "dialogue");
            return hits;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private void addHits(List<RagHit> hits, JsonNode results, String category) {
        for (JsonNode node : results) {
            JsonNode meta = node.path("metadata");
            hits.add(new RagHit(
                    node.path("document_id").asText(""),
                    category,
                    node.path("content").asText(""),
                    meta.path("source_file").asText(""),
                    meta.path("source_url").asText(""),
                    meta.path("page").asText(""),
                    node.path("distance").asDouble(0)
            ));
        }
    }

    private static String stripSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
