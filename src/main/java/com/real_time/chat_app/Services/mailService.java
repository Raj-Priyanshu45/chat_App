package com.real_time.chat_app.Services;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class mailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${app.mail-from}")
    private String from;

    public void sendVerificationEmail(String to , String token){

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Verify your email");
        message.setText(
                "Use the token below to verify your email:\n\n" +
                        token + "\n\n" +
                        "This token expires in 30 minutes."
        );

        mailSender.send(message);
    }

    public void sendPasswordResetEmail(String to, String rawToken) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Reset your password");
        message.setText(
                "We received a request to reset your password.\n\n" +
                        "Open this link to choose a new one (valid for 15 minutes):\n" +
                        frontendUrl + "/reset-password?token=" + rawToken + "\n\n" +
                        "If you didn't request this, you can ignore this email."
        );
        mailSender.send(message);
    }
}