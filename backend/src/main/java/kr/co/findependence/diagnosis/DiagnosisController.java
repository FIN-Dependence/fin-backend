package kr.co.findependence.diagnosis;

import jakarta.validation.constraints.Pattern;
import kr.co.findependence.profile.ProfileService;
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

    @GetMapping("/{clientId}")
    public DiagnosisResponse get(@PathVariable @Pattern(regexp = "[A-Za-z0-9_-]{8,80}") String clientId) {
        return diagnosisService.diagnose(profileService.require(clientId));
    }
}
