package kr.co.findependence.chat;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
    private final ChatService service;

    public ChatController(ChatService service) { this.service = service; }

    @PostMapping
    public ChatResponse chat(Authentication authentication, @Valid @RequestBody ChatRequest request) {
        return service.chat(authentication.getName(), request);
    }

    @GetMapping("/history")
    public List<ChatService.HistoryMessage> history(Authentication authentication,
                                                    @RequestParam String environmentId) {
        return service.history(authentication.getName(), environmentId);
    }
}
