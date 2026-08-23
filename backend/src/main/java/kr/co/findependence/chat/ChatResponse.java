package kr.co.findependence.chat;

import kr.co.findependence.diagnosis.AdviceItem;

import java.time.Instant;
import java.util.List;

public record ChatResponse(String answer, List<AdviceItem> advice, List<String> sources, Instant createdAt) {}
