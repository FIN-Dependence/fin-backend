package kr.co.findependence.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "findependence.auth")
public record AuthSettings(String jwtSecret, boolean allowEphemeralKey, boolean cookieSecure, int ttlMinutes) {
    public static final String COOKIE = "FIN_SESSION";
    public static final String ISSUER = "findependence-api";
    public static final String AUDIENCE = "findependence-web";
}
