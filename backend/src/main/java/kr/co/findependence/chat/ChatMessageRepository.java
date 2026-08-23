package kr.co.findependence.chat;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {
    List<ChatMessageEntity> findTop10ByClientIdOrderByCreatedAtDesc(String clientId);
}
