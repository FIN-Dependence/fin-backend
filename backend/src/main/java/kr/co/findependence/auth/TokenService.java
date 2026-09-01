package kr.co.findependence.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final AuthSettings settings;
    private final AuthSessionRepository sessions;
    public TokenService(AuthSettings settings, AuthSessionRepository sessions) {
        this.settings = settings; this.sessions = sessions;
        byte[] bytes = settings.jwtSecret() == null ? new byte[0] : settings.jwtSecret().getBytes(StandardCharsets.UTF_8);
        if (bytes.length == 0 && settings.allowEphemeralKey() && !settings.cookieSecure()) {
            bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
            LoggerFactory.getLogger(getClass()).warn("LOCAL DEVELOPMENT: ephemeral JWT key; restart requires login. Configure JWT_SECRET before deployment.");
        }
        if (bytes.length < 32) throw new IllegalStateException("JWT_SECRET must contain at least 32 bytes; use a random secret.");
        if (settings.ttlMinutes() < 1 || settings.ttlMinutes() > 60) throw new IllegalStateException("JWT_TTL_MINUTES must be between 1 and 60.");
        var key = new SecretKeySpec(bytes, "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        var jwtDecoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        jwtDecoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(AuthSettings.ISSUER));
        this.decoder = jwtDecoder;
    }
    @Transactional
    public String issue(String userId, AccountRole role) {
        var now = Instant.now();
        var expires = now.plus(Duration.ofMinutes(settings.ttlMinutes()));
        var jti = UUID.randomUUID().toString();
        sessions.deleteByExpiresAtBefore(now);
        sessions.save(new AuthSession(jti, userId, expires));
        var claims = JwtClaimsSet.builder().issuer(AuthSettings.ISSUER).subject(userId)
                .audience(List.of(AuthSettings.AUDIENCE)).issuedAt(now).expiresAt(expires).id(jti)
                .claim("role", role.name()).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
    public Jwt verify(String token) {
        Jwt jwt = decoder.decode(token);
        if (jwt.getId() == null || jwt.getSubject() == null || jwt.getExpiresAt() == null
                || !jwt.getExpiresAt().isAfter(Instant.now()) || !jwt.getAudience().contains(AuthSettings.AUDIENCE))
            throw new JwtException("Invalid session claims");
        var session = sessions.findById(jwt.getId()).orElseThrow(() -> new JwtException("Session revoked"));
        if (!session.getUserId().equals(jwt.getSubject()) || !session.getExpiresAt().isAfter(Instant.now()))
            throw new JwtException("Invalid session");
        return jwt;
    }
    @Transactional
    public void revoke(String jti) { sessions.deleteById(jti); }
}
