package kr.co.findependence.auth;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthSessionRepository extends JpaRepository<AuthSession, String> {
    long deleteByExpiresAtBefore(Instant now);
    long deleteByUserId(String userId);
}
