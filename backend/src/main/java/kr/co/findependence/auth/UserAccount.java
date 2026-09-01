package kr.co.findependence.auth;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_accounts", uniqueConstraints = @UniqueConstraint(name = "uk_account_email", columnNames = "email"))
public class UserAccount {
    @Id @Column(length = 36) private String id;
    @Column(nullable = false, length = 254) private String email;
    @Column(nullable = false, length = 40) private String displayName;
    @Column(nullable = false, length = 100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(length = 16) private AccountRole role;
    @Column(nullable = false) private Instant createdAt;
    protected UserAccount() {}
    UserAccount(String email, String displayName, String passwordHash) {
        this(email, displayName, passwordHash, AccountRole.USER);
    }
    UserAccount(String email, String displayName, String passwordHash, AccountRole role) {
        this.id = UUID.randomUUID().toString();
        this.email = email; this.displayName = displayName;
        this.passwordHash = passwordHash; this.role = role; this.createdAt = Instant.now();
    }
    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public String getPasswordHash() { return passwordHash; }
    public AccountRole getRole() { return role == null ? AccountRole.USER : role; }
    void ensureUserRole() { if (role == null) role = AccountRole.USER; }
    void promoteToAdmin() { role = AccountRole.ADMIN; }
}
