package kr.co.findependence;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(exclude = org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class)
public class FindependenceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FindependenceApplication.class, args);
    }
}
