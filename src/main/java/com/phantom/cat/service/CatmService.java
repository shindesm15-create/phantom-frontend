package com.phantom.cat.service;

import com.phantom.cat.model.User;
import com.phantom.cat.model.Catm;

import com.phantom.cat.repository.UserRepository;
import com.phantom.cat.repository.CatmRepository;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.ArrayList;

@Service
public class CatmService {

    private final UserRepository userRepo;
    private final CatmRepository catmRepo;

    public CatmService(
            UserRepository userRepo,
            CatmRepository catmRepo) {

        this.userRepo = userRepo;
        this.catmRepo = catmRepo;
    }

    // ================= REGISTER =================

    public String createUser(
            String name,
            String password) {

        if(name == null || password == null){
            return "Invalid data";
        }

        User exist =
                userRepo.findByName(name);

        if(exist != null){
            return "User already exists";
        }

        User user = new User();

        user.setName(name);
        user.setPassword(password);

        userRepo.save(user);

        return "User created";
    }

    // ================= LOGIN =================

   public String login(String name, String password) {

    User user = userRepo.findByName(name);

    if (user == null) {
        return "User not found";
    }

    if (!user.getPassword().equals(password)) {
        return "Wrong password";
    }

    return "success";
}

    // ================= SEND MESSAGE =================

    public String sendMessage(String from, String to, String content) {

    if(from == null || to == null || content == null){
        return "Invalid message";
    }

    Catm msg = new Catm();
    msg.setFrom(from);
    msg.setTo(to);
    msg.setContent(content);

    msg.setStatus("sent");
    msg.setTemp(true);          // FIX: make it temporary if needed
    msg.setSeenTime(0);

    catmRepo.save(msg);

    return "sent";
}


    public void seenCatm(String from, String to) {

    List<Catm> all = catmRepo.findAll();

    for(Catm m : all) {

        boolean match =
                m.getFrom().equals(from) &&
                m.getTo().equals(to);

        if(match) {

            m.setStatus("seen");

            if(m.isTemp()){
                m.setSeenTime(System.currentTimeMillis()); 
            }

            catmRepo.save(m);
        }
    }
}

    // ================= GET CHAT =================

    public List<Catm> getMessages(
            String user1,
            String user2){

        List<Catm> all =
                catmRepo.findAll();

        List<Catm> result =
                new ArrayList<>();

        for(Catm m : all){

            boolean match =

                    (m.getFrom().equals(user1)
                    &&
                    m.getTo().equals(user2))

                    ||

                    (m.getFrom().equals(user2)
                    &&
                    m.getTo().equals(user1));

            if(match){
                result.add(m);
            }
        }
        for(Catm m : all){

    // 🔥 AUTO DELETE AFTER 24 HOURS
    if(m.isTemp() && m.getSeenTime() > 0){

        long diff = System.currentTimeMillis() - m.getSeenTime();
        long hours = diff / (1000 * 60 * 60);

        if(hours >= 24){
            catmRepo.delete(m);
            continue;
        }
    }

    boolean match =
            (m.getFrom().equals(user1) && m.getTo().equals(user2))
            ||
            (m.getFrom().equals(user2) && m.getTo().equals(user1));

    if(match){
        result.add(m);
    }
}

        return result;
    }

    // ================= ALL USERS =================

    public List<String> getAllUsers(){

        List<User> all =
                userRepo.findAll();

        List<String> names =
                new ArrayList<>();

        for(User u : all){
            names.add(u.getName());
        }

        return names;
    }
}