package kr.co.findependence.chat;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "chat_messages", indexes = @Index(name = "idx_chat_client_created", columnList = "client_id,created_at"))
public class ChatMessageEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @jakarta.persistence.Column(name = "client_id")
    private String clientId;
    private String role;
    @jakarta.persistence.Column(length = 5000)
    private String content;
    @jakarta.persistence.Column(name = "created_at")
    private Instant createdAt;

    protected ChatMessageEntity() {}

    public ChatMessageEntity(String clientId, String role, String content) {
        this.clientId = clientId;
        this.role = role;
        this.content = content;
        this.createdAt = Instant.now();
    }

    public String getRole() { return role; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
