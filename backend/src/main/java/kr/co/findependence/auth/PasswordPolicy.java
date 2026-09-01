package kr.co.findependence.auth;

import java.util.regex.Pattern;

final class PasswordPolicy {
    static final String MESSAGE = "비밀번호는 8~17자의 영문자·숫자·특수문자로 입력하고, 대문자·숫자·특수문자(!@#$%^&*_-)를 각각 1개 이상 포함해 주세요.";
    private static final Pattern ALLOWED = Pattern.compile("^[A-Za-z0-9!@#$%^&*_\\-]{8,17}$");
    private static final Pattern UPPER = Pattern.compile("[A-Z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[!@#$%^&*_\\-]");

    private PasswordPolicy() {}

    static boolean isValid(String password) {
        return password != null && ALLOWED.matcher(password).matches()
                && UPPER.matcher(password).find()
                && DIGIT.matcher(password).find()
                && SPECIAL.matcher(password).find();
    }

    static void requireValid(String password) {
        if (!isValid(password)) throw new AuthException(org.springframework.http.HttpStatus.BAD_REQUEST, MESSAGE);
    }
}
