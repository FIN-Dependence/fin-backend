package kr.co.findependence.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {
    List<ChatMessageEntity> findTop50ByClientIdAndEnvironmentIdOrderByCreatedAtDesc(String clientId, String environmentId);
    List<ChatMessageEntity> findTop10ByClientIdAndEnvironmentIdOrderByCreatedAtDesc(String clientId, String environmentId);
    void deleteByClientIdAndEnvironmentId(String clientId, String environmentId);
}
