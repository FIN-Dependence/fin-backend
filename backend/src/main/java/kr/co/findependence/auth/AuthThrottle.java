package kr.co.findependence.auth;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** Single-instance MVP throttle. Use a shared edge/Redis limiter for public multi-instance deployment. */
@Component
public class AuthThrottle {
    private record Attempts(int count, Instant until) {}
    private final Map<String, Attempts> attempts = new HashMap<>();
    public synchronized void check(String address) {
        var now = Instant.now();
        attempts.entrySet().removeIf(e -> !e.getValue().until().isAfter(now));
        var previous = attempts.get(address);
        if ((previous != null && previous.count() >= 15) || (previous == null && attempts.size() >= 10000))
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS, "요청이 많습니다. 15분 후 다시 시도해 주세요.");
        attempts.put(address, previous == null ? new Attempts(1, now.plusSeconds(900))
                : new Attempts(previous.count() + 1, previous.until()));
    }
}
