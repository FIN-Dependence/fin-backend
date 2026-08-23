package kr.co.findependence.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.findependence.config.AppProperties;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class LlmClient {
    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public LlmClient(AppProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public Optional<String> complete(String systemPrompt, String userPrompt) {
        if (!properties.llm().enabled()) return Optional.empty();
        try {
            Map<String, Object> body = Map.of(
                    "model", properties.llm().model(),
                    "temperature", properties.llm().temperature(),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", userPrompt)
                    ));
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(stripSlash(properties.llm().baseUrl()) + "/chat/completions"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)));
            if (properties.llm().apiKey() != null && !properties.llm().apiKey().isBlank()) {
                builder.header("Authorization", "Bearer " + properties.llm().apiKey());
            }
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) return Optional.empty();
            JsonNode root = objectMapper.readTree(response.body());
            return Optional.ofNullable(root.at("/choices/0/message/content").textValue()).filter(s -> !s.isBlank());
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private static String stripSlash(String value) {
        return value != null && value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
