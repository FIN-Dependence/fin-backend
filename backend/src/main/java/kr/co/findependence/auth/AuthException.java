package kr.co.findependence.auth;

import org.springframework.http.HttpStatus;

public class AuthException extends RuntimeException {
    public final HttpStatus status;
    public AuthException(HttpStatus status, String message) { super(message); this.status = status; }
}
