package kr.co.findependence.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public record RegisterRequest(
            @NotBlank @Size(max = 254) String email,
            @NotBlank @Size(min = 2, max = 40) String displayName,
            @NotBlank @Size(min = 8, max = 17) String password,
            @NotBlank @Size(min = 8, max = 17) String confirmPassword) {}
    public record LoginRequest(@NotBlank @Size(max = 254) String email,
                               @NotBlank @Size(max = 64) String password) {}
    public record UserView(String id, String email, String displayName, AccountRole role) {
        static UserView of(UserAccount user) { return new UserView(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole()); }
    }
    private final UserAccountRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final AuthSettings settings;
    private final AuthThrottle throttle;
    private final CsrfTokenRepository csrf;
    private final String dummyHash;
    public AuthController(UserAccountRepository users, PasswordEncoder passwords, TokenService tokens,
                          AuthSettings settings, AuthThrottle throttle, CsrfTokenRepository csrf) {
        this.users = users; this.passwords = passwords; this.tokens = tokens;
        this.settings = settings; this.throttle = throttle; this.csrf = csrf;
        this.dummyHash = passwords.encode("not-a-real-account-password");
    }
    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) { return Map.of("token", token.getToken(), "headerName", token.getHeaderName()); }

    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public UserView register(@Valid @RequestBody RegisterRequest body, HttpServletRequest request, HttpServletResponse response) {
        throttle.check(request.getRemoteAddr());
        if (!body.password().equals(body.confirmPassword()))
            throw new AuthException(HttpStatus.BAD_REQUEST, "비밀번호 확인이 일치하지 않습니다.");
        PasswordPolicy.requireValid(body.password());
        if (body.displayName().strip().length() < 2)
            throw new AuthException(HttpStatus.BAD_REQUEST, "이름 또는 별명은 2~40자로 입력해 주세요.");
        String email = normalize(body.email());
        EmailAddressPolicy.requireValid(email);
        if (users.existsByEmail(email)) throw duplicate();
        UserAccount user;
        try { user = users.saveAndFlush(new UserAccount(email, body.displayName().strip(), passwords.encode(body.password()))); }
        catch (DataIntegrityViolationException e) { throw duplicate(); }
        authenticate(user, request, response);
        return UserView.of(user);
    }
    @PostMapping("/login")
    public UserView login(@Valid @RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        throttle.check(request.getRemoteAddr());
        checkPasswordLength(body.password());
        String email = normalize(body.email());
        var user = users.findByEmail(email);
        boolean matches = passwords.matches(body.password(), user.map(UserAccount::getPasswordHash).orElse(dummyHash));
        if (user.isEmpty() || !matches)
            throw new AuthException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.");
        authenticate(user.get(), request, response);
        return UserView.of(user.get());
    }
    @GetMapping("/me")
    public UserView me(Authentication authentication) {
        return UserView.of(users.findById(authentication.getName()).orElseThrow(() ->
                new AuthException(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요.")));
    }
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        tokens.revoke((String) authentication.getDetails());
        response.addHeader(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
        csrf.saveToken(null, request, response);
    }
    private void authenticate(UserAccount user, HttpServletRequest request, HttpServletResponse response) {
        // Revoke the previous cookie session on account switch; never transfer anonymous survey data.
        if (request.getCookies() != null) for (var c : request.getCookies()) {
            if (AuthSettings.COOKIE.equals(c.getName())) {
                try { tokens.revoke(tokens.verify(c.getValue()).getId()); }
                catch (org.springframework.security.oauth2.jwt.JwtException ignored) { /* already expired */ }
            }
        }
        response.addHeader(HttpHeaders.SET_COOKIE, cookie(tokens.issue(user.getId(), user.getRole()), Duration.ofMinutes(settings.ttlMinutes())).toString());
        csrf.saveToken(null, request, response);
    }
    private ResponseCookie cookie(String value, Duration age) {
        return ResponseCookie.from(AuthSettings.COOKIE, value).httpOnly(true).secure(settings.cookieSecure())
                .sameSite("Lax").path("/api").maxAge(age).build();
    }
    private static String normalize(String email) { return email.strip().toLowerCase(Locale.ROOT); }
    private static void checkPasswordLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new AuthException(HttpStatus.BAD_REQUEST, "비밀번호는 UTF-8 기준 72바이트 이하로 입력해 주세요.");
    }
    private static AuthException duplicate() { return new AuthException(HttpStatus.CONFLICT, "가입할 수 없는 이메일입니다. 기존 계정으로 로그인해 주세요."); }
}
