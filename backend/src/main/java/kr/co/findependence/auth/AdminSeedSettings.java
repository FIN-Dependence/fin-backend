package kr.co.findependence.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "findependence.admin")
public record AdminSeedSettings(boolean enabled, String email, String password, String displayName) {}
