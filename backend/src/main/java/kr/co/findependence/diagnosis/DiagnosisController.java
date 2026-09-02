package kr.co.findependence.diagnosis;

import jakarta.validation.constraints.Pattern;
import kr.co.findependence.profile.ProfileService;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/diagnoses")
public class DiagnosisController {
    private final ProfileService profileService;
    private final DiagnosisService diagnosisService;

    public DiagnosisController(ProfileService profileService, DiagnosisService diagnosisService) {
        this.profileService = profileService;
        this.diagnosisService = diagnosisService;
    }

    @GetMapping("/me")
    public DiagnosisResponse get(Authentication authentication) {
        return diagnosisService.diagnose(profileService.require(authentication.getName()));
    }

    @GetMapping("/{environmentId}")
    public DiagnosisResponse get(Authentication authentication, @PathVariable String environmentId) {
        return diagnosisService.diagnose(profileService.require(authentication.getName(), environmentId));
    }
}
