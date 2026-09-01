package kr.co.findependence.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.*;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
@EnableConfigurationProperties({AuthSettings.class, AdminSeedSettings.class})
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean CsrfTokenRepository csrfRepository(AuthSettings settings) {
        var repo = new CookieCsrfTokenRepository();
        repo.setCookieCustomizer(cookie -> cookie.httpOnly(true).secure(settings.cookieSecure()).sameSite("Lax").path("/api"));
        return repo;
    }
    @Bean SecurityFilterChain security(HttpSecurity http, TokenService tokens, CsrfTokenRepository csrf, ObjectMapper json) throws Exception {
        http.cors(cors -> {})
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(config -> config.csrfTokenRepository(csrf).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .formLogin(form -> form.disable()).httpBasic(basic -> basic.disable()).logout(logout -> logout.disable())
            .requestCache(cache -> cache.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/auth/csrf", "/api/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
                .requestMatchers("/api/**").authenticated().anyRequest().denyAll())
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((req, res, ex) -> error(res, json, 401, "로그인이 필요합니다. 다시 로그인해 주세요."))
                .accessDeniedHandler((req, res, ex) -> error(res, json, 403, "요청을 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.")))
            .addFilterBefore(new OncePerRequestFilter() {
                @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
                        throws IOException, ServletException {
                    String path = request.getServletPath();
                    if (!path.equals("/api/auth/login") && !path.equals("/api/auth/register")
                            && !path.equals("/api/auth/csrf") && !path.equals("/api/health")) {
                        if (request.getCookies() != null) for (var cookie : request.getCookies()) {
                            if (!AuthSettings.COOKIE.equals(cookie.getName())) continue;
                            try {
                                var jwt = tokens.verify(cookie.getValue());
                                AccountRole role;
                                try { role = AccountRole.valueOf(jwt.getClaimAsString("role")); }
                                catch (IllegalArgumentException | NullPointerException ignored) { role = AccountRole.USER; }
                                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
                                var authentication = new UsernamePasswordAuthenticationToken(jwt.getSubject(), null, authorities);
                                authentication.setDetails(jwt.getId());
                                SecurityContextHolder.getContext().setAuthentication(authentication);
                            } catch (JwtException | IllegalArgumentException e) {
                                SecurityContextHolder.clearContext();
                                error(response, json, 401, "로그인이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.");
                                return;
                            }
                            break;
                        }
                    }
                    chain.doFilter(request, response);
                }
            }, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    private static void error(HttpServletResponse response, ObjectMapper json, int status, String message) throws IOException {
        response.setStatus(status); response.setContentType("application/json;charset=UTF-8");
        json.writeValue(response.getWriter(), Map.of("status", status, "message", message));
    }
}
