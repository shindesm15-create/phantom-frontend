package com.phantom.cat.service;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OnlineUserService {

    private final Set<String> onlineUsers =
            ConcurrentHashMap.newKeySet();

    public void online(String user){
        onlineUsers.add(user);
    }

    public void offline(String user){
        onlineUsers.remove(user);
    }

    public Set<String> getOnlineUsers(){
        return onlineUsers;
    }
}