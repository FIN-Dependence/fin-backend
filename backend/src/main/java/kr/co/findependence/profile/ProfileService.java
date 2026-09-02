package kr.co.findependence.profile;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {
    private final ProfileRepository repository;

    public ProfileService(ProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ProfileEntity require(String ownerId, String environmentId) {
        return repository.findByClientIdAndOwnerId(environmentId, ownerId)
                .orElseThrow(() -> new EntityNotFoundException("저장된 금융환경을 찾을 수 없습니다."));
    }

    @Transactional
    public ProfileEntity require(String ownerId) {
        return listEntities(ownerId).stream().findFirst()
                .orElseThrow(() -> new EntityNotFoundException("저장된 금융환경을 찾을 수 없습니다."));
    }

    @Transactional
    public List<ProfileResponse> list(String ownerId) {
        migrateLegacy(ownerId);
        return repository.findByOwnerIdOrderByUpdatedAtDesc(ownerId).stream().map(ProfileResponse::from).toList();
    }

    private List<ProfileEntity> listEntities(String ownerId) {
        migrateLegacy(ownerId);
        return repository.findByOwnerIdOrderByUpdatedAtDesc(ownerId);
    }

    private void migrateLegacy(String ownerId) {
        repository.findById(ownerId).filter(profile -> profile.getOwnerId() == null).ifPresent(profile -> {
            profile.claimLegacy(ownerId);
            repository.save(profile);
        });
    }

    @Transactional
    public ProfileResponse get(String clientId) {
        return ProfileResponse.from(require(clientId));
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(String ownerId, String environmentId) {
        return ProfileResponse.from(require(ownerId, environmentId));
    }

    @Transactional
    public ProfileResponse save(String clientId, ProfileRequest request) {
        migrateLegacy(clientId);
        ProfileEntity profile = listEntities(clientId).stream().findFirst()
                .orElseGet(() -> new ProfileEntity(clientId, clientId, defaultTitle(request, 1)));
        profile.update(request);
        return ProfileResponse.from(repository.save(profile));
    }

    @Transactional
    public ProfileResponse create(String ownerId, ProfileRequest request) {
        migrateLegacy(ownerId);
        long count = repository.countByOwnerId(ownerId);
        if (count >= 5) throw new IllegalStateException("금융환경은 계정당 최대 5개까지 저장할 수 있습니다.");
        ProfileEntity profile = new ProfileEntity(UUID.randomUUID().toString(), ownerId, defaultTitle(request, count + 1));
        profile.update(request);
        return ProfileResponse.from(repository.save(profile));
    }

    @Transactional
    public ProfileResponse save(String ownerId, String environmentId, ProfileRequest request) {
        ProfileEntity profile = require(ownerId, environmentId);
        profile.update(request);
        return ProfileResponse.from(repository.save(profile));
    }

    @Transactional
    public void delete(String clientId) {
        listEntities(clientId).forEach(repository::delete);
    }

    @Transactional
    public void delete(String ownerId, String environmentId) {
        repository.delete(require(ownerId, environmentId));
    }

    private static String defaultTitle(ProfileRequest request, long number) {
        return request.title() == null || request.title().isBlank() ? "독립 환경 " + number : request.title().trim();
    }
}
