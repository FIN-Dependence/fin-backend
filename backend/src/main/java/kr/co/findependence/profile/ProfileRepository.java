package kr.co.findependence.profile;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProfileRepository extends JpaRepository<ProfileEntity, String> {
    List<ProfileEntity> findByOwnerIdOrderByUpdatedAtDesc(String ownerId);
    Optional<ProfileEntity> findByClientIdAndOwnerId(String clientId, String ownerId);
    long countByOwnerId(String ownerId);
}
