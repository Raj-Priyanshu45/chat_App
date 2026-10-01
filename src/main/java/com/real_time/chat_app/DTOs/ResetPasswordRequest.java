package com.real_time.chat_app.DTOs;

public record ResetPasswordRequest(String token, String newPassword) {}