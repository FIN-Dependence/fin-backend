package kr.co.findependence.auth;

import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;

final class EmailAddressPolicy {
    private static final Pattern LOCAL = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._%+\\-]{0,63}");
    private static final Pattern DOMAIN = Pattern.compile(
            "(?=.{3,189}$)(?:[A-Za-z0-9](?:[A-Za-z0-9\\-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,24}");
    private static final String MESSAGE = "올바르지 않은 이메일 형식입니다. 아이디와 도메인을 확인해 주세요.";

    private EmailAddressPolicy() {}

    static void requireValid(String email) {
        if (email == null || email.length() > 254) throw invalid();
        int at = email.indexOf('@');
        if (at < 1 || at != email.lastIndexOf('@')) throw invalid();
        String local = email.substring(0, at);
        String domain = email.substring(at + 1);
        if (!LOCAL.matcher(local).matches() || local.contains("..") || !DOMAIN.matcher(domain).matches()) throw invalid();
    }

    private static AuthException invalid() {
        return new AuthException(HttpStatus.BAD_REQUEST, MESSAGE);
    }
}
