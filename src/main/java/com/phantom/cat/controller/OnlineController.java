package com.phantom.cat.controller;

import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
public class OnlineController {

    private final Set<String> onlineUsers = new HashSet<>();

    @PostMapping("/online")
    public void online(@RequestParam String user) {
        onlineUsers.add(user);
    }

    @PostMapping("/offline")
    public void offline(@RequestParam String user) {
        onlineUsers.remove(user);
    }

    @GetMapping("/online-users")
    public List<String> getOnlineUsers() {
        return new ArrayList<>(onlineUsers);
    }
}