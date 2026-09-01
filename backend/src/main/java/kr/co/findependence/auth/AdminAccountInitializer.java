package kr.co.findependence.auth;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminAccountInitializer implements ApplicationRunner {
    private final AdminSeedSettings settings;
    private final UserAccountRepository users;
    private final PasswordEncoder passwords;

    public AdminAccountInitializer(AdminSeedSettings settings, UserAccountRepository users, PasswordEncoder passwords) {
        this.settings = settings;
        this.users = users;
        this.passwords = passwords;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var existingAccounts = users.findAll();
        existingAccounts.forEach(UserAccount::ensureUserRole);
        users.saveAll(existingAccounts);
        if (!settings.enabled()) return;
        PasswordPolicy.requireValid(settings.password());
        String email = settings.email().strip().toLowerCase(java.util.Locale.ROOT);
        EmailAddressPolicy.requireValid(email);
        var admin = users.findByEmail(email).orElseGet(() ->
                new UserAccount(email, settings.displayName().strip(), passwords.encode(settings.password()), AccountRole.ADMIN));
        admin.promoteToAdmin();
        users.save(admin);
    }
}
