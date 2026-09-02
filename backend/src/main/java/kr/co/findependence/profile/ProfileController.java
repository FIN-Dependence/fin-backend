package kr.co.findependence.profile;

import jakarta.validation.Valid;
import kr.co.findependence.chat.ChatService;
import org.springframework.security.core.Authentication;
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
import org.springframework.web.bind.annotation.PostMapping;
import java.util.List;

@Validated
@RestController
@RequestMapping("/api/profiles")
public class ProfileController {
    private final ProfileService service;
    private final ChatService chatService;

    public ProfileController(ProfileService service, ChatService chatService) {
        this.service = service;
        this.chatService = chatService;
    }

    @GetMapping("/me")
    public ProfileResponse get(Authentication authentication) {
        return service.get(authentication.getName());
    }

    @GetMapping
    public List<ProfileResponse> list(Authentication authentication) {
        return service.list(authentication.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProfileResponse create(Authentication authentication, @Valid @RequestBody ProfileRequest request) {
        return service.create(authentication.getName(), request);
    }

    @GetMapping("/{environmentId}")
    public ProfileResponse get(Authentication authentication, @PathVariable String environmentId) {
        return service.get(authentication.getName(), environmentId);
    }

    @PutMapping("/{environmentId}")
    public ProfileResponse save(Authentication authentication, @PathVariable String environmentId,
                                @Valid @RequestBody ProfileRequest request) {
        return service.save(authentication.getName(), environmentId, request);
    }

    @DeleteMapping("/{environmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication authentication, @PathVariable String environmentId) {
        chatService.deleteHistory(authentication.getName(), environmentId);
        service.delete(authentication.getName(), environmentId);
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
