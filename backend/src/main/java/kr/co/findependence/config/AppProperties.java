package kr.co.findependence.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "findependence")
public record AppProperties(Cors cors, Llm llm, Rag rag) {
    public record Cors(String allowedOrigins) {}
    public record Llm(boolean enabled, String baseUrl, String apiKey, String model, double temperature) {}
    public record Rag(boolean enabled, String searchUrl, int timeoutMs, int officialResults, int dialogueResults) {}
}
