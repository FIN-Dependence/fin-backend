package kr.co.findependence.profile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/profiles")
public class ProfileController {
    private final ProfileService service;

    public ProfileController(ProfileService service) { this.service = service; }

    @GetMapping("/{clientId}")
    public ProfileResponse get(@PathVariable @Pattern(regexp = "[A-Za-z0-9_-]{8,80}") String clientId) {
        return service.get(clientId);
    }

    @PutMapping("/{clientId}")
    public ProfileResponse save(
            @PathVariable @Pattern(regexp = "[A-Za-z0-9_-]{8,80}") String clientId,
            @Valid @RequestBody ProfileRequest request) {
        return service.save(clientId, request);
    }

    @DeleteMapping("/{clientId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Pattern(regexp = "[A-Za-z0-9_-]{8,80}") String clientId) {
        service.delete(clientId);
    }
}
