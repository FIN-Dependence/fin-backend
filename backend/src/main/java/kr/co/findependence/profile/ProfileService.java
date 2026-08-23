package kr.co.findependence.profile;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
    private final ProfileRepository repository;

    public ProfileService(ProfileRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public ProfileEntity require(String clientId) {
        return repository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("저장된 금융환경을 찾을 수 없습니다."));
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(String clientId) {
        return ProfileResponse.from(require(clientId));
    }

    @Transactional
    public ProfileResponse save(String clientId, ProfileRequest request) {
        ProfileEntity profile = repository.findById(clientId).orElseGet(() -> new ProfileEntity(clientId));
        profile.update(request);
        return ProfileResponse.from(repository.save(profile));
    }

    @Transactional
    public void delete(String clientId) {
        repository.deleteById(clientId);
    }
}
