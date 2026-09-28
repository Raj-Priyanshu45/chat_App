package com.real_time.chat_app.eventListner;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class mailEventListener {

    @EventListener
    public void onEmailVerification(){

    }
}
