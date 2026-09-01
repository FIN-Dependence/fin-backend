package kr.co.findependence.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserAccountRepository users;
    @Autowired AuthSessionRepository sessions;
    @Autowired TokenService tokens;
    @Autowired PasswordEncoder encoder;
    private static final String PASSWORD = "TestPass1!";
    private static final String PROFILE = """
            {"name":"Alice", "age":26,"employment":"첫 취업 · 정규직","monthlyIncome":2450000,
             "housingType":"월세","monthlyRent":650000,"maintenance":80000,"debtPayment":140000}
            """;

    record Account(String id, String email, Cookie cookie) {}

    // Exercise the actual double-submit CSRF endpoint, cookie and header, not a mock authentication.
    private MockHttpServletRequestBuilder secured(MockHttpServletRequestBuilder request) throws Exception {
        var response = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn().getResponse();
        var csrf = json.readTree(response.getContentAsString());
        return request.cookie(response.getCookie("XSRF-TOKEN"))
                .header(csrf.get("headerName").asText(), csrf.get("token").asText());
    }
    private String body(String email, String password, String confirmation) throws Exception {
        return json.writeValueAsString(Map.of("email", email, "displayName", "Test User",
                "password", password, "confirmPassword", confirmation));
    }
    private Account account() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        var response = mvc.perform(secured(post("/api/auth/register")).with(r -> { r.setRemoteAddr(email); return r; })
                .contentType(MediaType.APPLICATION_JSON).content(body(email, PASSWORD, PASSWORD)))
                .andExpect(status().isCreated()).andReturn().getResponse();
        var cookie = response.getHeaders("Set-Cookie").stream().filter(s -> s.startsWith("FIN_SESSION="))
                .map(MockCookie::parse).findFirst().orElseThrow();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api");
        assertThat(cookie.getSameSite()).isEqualTo("Lax");
        assertThat(response.getContentAsString()).doesNotContain(PASSWORD, "passwordHash", "accessToken");
        assertThat(json.readTree(response.getContentAsString()).get("role").asText()).isEqualTo("USER");
        return new Account(json.readTree(response.getContentAsString()).get("id").asText(), email, cookie);
    }
    @Test void registrationHashesPasswordsAndIssuesVerifiedJwt() throws Exception {
        var a = account();
        var hash = users.findById(a.id()).orElseThrow().getPasswordHash();
        assertThat(hash).isNotEqualTo(PASSWORD);
        assertThat(encoder.matches(PASSWORD, hash)).isTrue();
        assertThat(users.findById(a.id()).orElseThrow().getRole()).isEqualTo(AccountRole.USER);
        var jwt = tokens.verify(a.cookie().getValue());
        assertThat(jwt.getSubject()).isEqualTo(a.id());
        assertThat(jwt.getClaimAsString("role")).isEqualTo("USER");
        mvc.perform(get("/api/auth/me").cookie(a.cookie())).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(a.id())).andExpect(jsonPath("$.role").value("USER"));
    }
    @Test void anonymousCannotReadPrivateEndpoints() throws Exception {
        for (String path : new String[]{"/api/auth/me", "/api/profiles/me", "/api/diagnoses/me", "/api/chat/history"})
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(secured(post("/api/chat")).contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"안녕\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void mutationRequiresCsrfEvenForLoginAndRegistration() throws Exception {
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body("no-csrf@example.test", PASSWORD, PASSWORD)))
                .andExpect(status().isForbidden());
        var a = account();
        mvc.perform(put("/api/profiles/me").cookie(a.cookie()).contentType(MediaType.APPLICATION_JSON).content(PROFILE))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").cookie(a.cookie())).andExpect(status().isForbidden());
    }
    @Test void registrationValidationAndDuplicateEmail() throws Exception {
        String ip = UUID.randomUUID().toString();
        for (String invalid : new String[]{body("invalid", PASSWORD, PASSWORD), body("a@b", PASSWORD, PASSWORD),
                body("bad..email@example.com", PASSWORD, PASSWORD), body("a@-example.com", PASSWORD, PASSWORD),
                body("valid@example.test", "short", "short"),
                body("valid@example.test", PASSWORD, "mismatch"), body("valid@example.test", "가".repeat(30), "가".repeat(30))})
            mvc.perform(secured(post("/api/auth/register")).with(r -> { r.setRemoteAddr(ip); return r; })
                    .contentType(MediaType.APPLICATION_JSON).content(invalid)).andExpect(status().isBadRequest());
        var a = account();
        mvc.perform(secured(post("/api/auth/register")).contentType(MediaType.APPLICATION_JSON)
                .content(body(a.email().toUpperCase(), PASSWORD, PASSWORD))).andExpect(status().isConflict());
    }
    @Test void registrationEnforcesStrongAllowlistedPasswords() throws Exception {
        String ip = UUID.randomUUID().toString();
        for (String invalid : new String[]{"lowercase1!", "NoNumber!", "NoSpecial1", "BadQuote1'", "TooLongPassword123!"}) {
            mvc.perform(secured(post("/api/auth/register")).with(r -> { r.setRemoteAddr(ip + invalid); return r; })
                    .contentType(MediaType.APPLICATION_JSON).content(body(UUID.randomUUID() + "@example.test", invalid, invalid)))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(secured(post("/api/auth/register")).with(r -> { r.setRemoteAddr(ip); return r; })
                .contentType(MediaType.APPLICATION_JSON).content(body(UUID.randomUUID() + "@example.test", "ValidPass1!", "ValidPass1!")))
                .andExpect(status().isCreated());
    }
    @Test void loginRejectsWrongPasswordAndAcceptsCorrectPassword() throws Exception {
        var a = account();
        mvc.perform(secured(post("/api/auth/login")).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", a.email(), "password", "wrong-password"))))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("이메일 또는 비밀번호를 확인해 주세요."));
        mvc.perform(secured(post("/api/auth/login")).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", a.email(), "password", PASSWORD))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(a.id()));
    }
    @Test void surveysAndChatAreIsolatedByAuthenticatedUser() throws Exception {
        var a = account(); var b = account();
        mvc.perform(secured(put("/api/profiles/me")).cookie(a.cookie()).contentType(MediaType.APPLICATION_JSON).content(PROFILE))
                .andExpect(status().isOk());
        mvc.perform(get("/api/profiles/me").cookie(b.cookie())).andExpect(status().isNotFound());
        mvc.perform(get("/api/profiles/" + a.id()).cookie(b.cookie())).andExpect(status().is4xxClientError());
        mvc.perform(secured(put("/api/profiles/" + a.id())).cookie(b.cookie()).contentType(MediaType.APPLICATION_JSON).content(PROFILE))
                .andExpect(status().is4xxClientError());
        mvc.perform(get("/api/diagnoses/" + a.id()).cookie(b.cookie())).andExpect(status().is4xxClientError());
        mvc.perform(secured(put("/api/profiles/me")).cookie(b.cookie()).contentType(MediaType.APPLICATION_JSON)
                .content(PROFILE.replace("Alice", "Bob").replace("2450000", "1900000"))).andExpect(status().isOk());
        // Supplying another user's clientId is ignored. The only ownership source is the verified JWT.
        mvc.perform(secured(post("/api/chat")).cookie(a.cookie()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("clientId", b.id(), "message", "독립 가능할까?"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value(org.hamcrest.Matchers.containsString("Alice")));
        mvc.perform(get("/api/chat/history").cookie(b.cookie())).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/chat/history").cookie(a.cookie())).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/profiles/me").cookie(a.cookie())).andExpect(jsonPath("$.monthlyIncome").value(2450000));
        mvc.perform(secured(delete("/api/profiles/me")).cookie(b.cookie())).andExpect(status().isNoContent());
        mvc.perform(get("/api/profiles/me").cookie(a.cookie())).andExpect(status().isOk());
    }
    @Test void profileValidationRejectsBadAgeNegativeAmountsAndMalformedBody() throws Exception {
        var a = account();
        for (String invalid : new String[]{PROFILE.replace("26", "10"), PROFILE.replace("2450000", "-1"), "{"})
            mvc.perform(secured(put("/api/profiles/me")).cookie(a.cookie()).contentType(MediaType.APPLICATION_JSON).content(invalid))
                    .andExpect(status().isBadRequest());
        mvc.perform(secured(post("/api/chat")).cookie(a.cookie()).contentType(MediaType.APPLICATION_JSON).content("{\"message\":\" \"}"))
                .andExpect(status().isBadRequest());
    }
    @Test void logoutRevokesTokenAndClearsCookie() throws Exception {
        var a = account();
        mvc.perform(secured(post("/api/auth/logout")).cookie(a.cookie()))
                .andExpect(status().isNoContent()).andExpect(header().stringValues("Set-Cookie", org.hamcrest.Matchers.hasItem(org.hamcrest.Matchers.containsString("Max-Age=0"))));
        mvc.perform(get("/api/auth/me").cookie(a.cookie())).andExpect(status().isUnauthorized());
    }
    @Test void tamperedAndExpiredSessionRejected() throws Exception {
        var a = account();
        String jwt = a.cookie().getValue();
        var parts = jwt.split("\\.");
        var forged = new Cookie(AuthSettings.COOKIE, parts[0] + "." + parts[1] + "." + "A".repeat(43));
        mvc.perform(get("/api/auth/me").cookie(forged)).andExpect(status().isUnauthorized());
        String jti = tokens.verify(jwt).getId();
        sessions.saveAndFlush(new AuthSession(jti, a.id(), Instant.now().minusSeconds(1)));
        mvc.perform(get("/api/auth/me").cookie(a.cookie())).andExpect(status().isUnauthorized());
    }
    @Test void csrfRotatesAfterAuthenticationAndCorsRejectsUntrustedOrigin() throws Exception {
        mvc.perform(options("/api/profiles/me").header("Origin", "https://attacker.example").header("Access-Control-Request-Method", "PUT"))
                .andExpect(status().isForbidden());
        mvc.perform(options("/api/profiles/me").header("Origin", "http://localhost:3000").header("Access-Control-Request-Method", "PUT"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Credentials", "true"));
        var a = account();
        // Registration emits the CSRF deletion cookie, so the browser must acquire a new token.
        mvc.perform(secured(put("/api/profiles/me")).cookie(a.cookie()).contentType(MediaType.APPLICATION_JSON).content(PROFILE)).andExpect(status().isOk());
    }
    @Test void limiterRejectsExcessiveAttemptsWithoutGrowingUnbounded() {
        var limiter = new AuthThrottle();
        for (int i = 0; i < 15; i++) limiter.check("test-ip");
        assertThatThrownBy(() -> limiter.check("test-ip")).isInstanceOf(AuthException.class);
    }
    @Test void invalidSigningKeyFailsClosed() {
        assertThatThrownBy(() -> new TokenService(new AuthSettings("weak", false, true, 30), sessions)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TokenService(new AuthSettings("", true, true, 30), sessions)).isInstanceOf(IllegalStateException.class);
    }

    @Test void configuredAdminIsPromotedWhileRegularAccountsStayUsers() throws Exception {
        var regular = account();
        String adminEmail = UUID.randomUUID() + "@example.test";
        var seed = new AdminAccountInitializer(
                new AdminSeedSettings(true, adminEmail, "AdminPass1!", "관리자"), users, encoder);
        seed.run(null);
        assertThat(users.findByEmail(adminEmail).orElseThrow().getRole()).isEqualTo(AccountRole.ADMIN);
        assertThat(users.findById(regular.id()).orElseThrow().getRole()).isEqualTo(AccountRole.USER);
    }
}
