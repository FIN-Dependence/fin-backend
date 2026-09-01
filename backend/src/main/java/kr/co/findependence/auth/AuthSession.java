package kr.co.findependence.auth;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "auth_sessions", indexes = @Index(name = "idx_session_expiry", columnList = "expiresAt"))
public class AuthSession {
    @Id @Column(length = 36) private String id;
    @Column(nullable = false, length = 36) private String userId;
    @Column(nullable = false) private Instant expiresAt;
    protected AuthSession() {}
    AuthSession(String id, String userId, Instant expiresAt) {
        this.id = id; this.userId = userId; this.expiresAt = expiresAt;
    }
    public String getUserId() { return userId; }
    public Instant getExpiresAt() { return expiresAt; }
}
