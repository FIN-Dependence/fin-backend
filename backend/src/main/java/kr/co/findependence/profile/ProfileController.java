package kr.co.findependence.profile;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
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

    @GetMapping("/me")
    public ProfileResponse get(Authentication authentication) {
        return service.get(authentication.getName());
    }

    @PutMapping("/me")
    public ProfileResponse save(
            Authentication authentication,
            @Valid @RequestBody ProfileRequest request) {
        return service.save(authentication.getName(), request);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication) {
        service.delete(authentication.getName());
    }
}
