package com.real_time.chat_app.Services;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class mailService {

    private final JavaMailSender mailSender;

    public void sendVerificationEmail(String to , String token){

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Verify your email");
        message.setText(
                "Use the token below to verify your email:\n\n" +
                        token + "\n\n" +
                        "This token expires in 30 minutes."
        );

        mailSender.send(message);
    }
}
