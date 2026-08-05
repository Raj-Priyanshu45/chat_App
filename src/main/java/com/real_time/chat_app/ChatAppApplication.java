package com.real_time.chat_app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

@SpringBootApplication
@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
public class ChatAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatAppApplication.class, args);
    }

}

//This tells Spring to automatically convert every Page<T> returned from any controller into a PagedModel<T>
//before serializing — stable, documented JSON shape (content, page.size, page.number, page.totalElements,
//page.totalPages), no code changes needed anywhere else,
//

//TODO:private chat for that i am just gonna use room with max size of 2 as when a person click on someone's username then a front end request will be done asking do you want private chat then after that a http req is made in that a random room id is created and stored in a seprate db as private chat also need to get stored so for that gonna use schema as kc id of both and then room id two entries per private chat and mess will be stored in message schema only based on room id message searching will be added so it looks easy to implement nothing crazy about it
//TODO:Now the second thing is public room its room generation will be done as same random and then it will be open for all this is tricky for this i need to expose the room id for that i think i am gonna add a button which will do like filter all the public room and user can join anyone but after filter how about the room id with it so when user clicks on room then the id is used and boom user joined for this i need some arch change as i need to add a enum public or private i think it will work
//TODO:user profile there should be something like user profile or /me endpoint should be more populated like it should show some things not just username that also require change or if wanna do some smart work then add new table associated with kc id will only get called in /me endpoint saves memory
//TODO: and one more thing i want to sep log out and leave room button leave room does not just logs the user out and then the  member should be like link as dm or show a link to dm to that user and discover public room is not working 
//TODO: add a button in home page which points to profile and by entering via kc redirect to /me and in then add a button for dm or something here all the friend list of user will be stored or dm list