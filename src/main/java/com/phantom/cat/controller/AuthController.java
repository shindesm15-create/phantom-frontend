package com.phantom.cat.controller;

import com.phantom.cat.model.User;
import com.phantom.cat.service.CatmService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin("*")
public class AuthController {

    private final CatmService service;

    public AuthController(CatmService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public String login(@RequestBody User user) {
        return service.login(user.getName(), user.getPassword());
    }

    @PostMapping("/register")
    public String register(@RequestBody User user) {
        return service.createUser(user.getName(), user.getPassword());
    }

   
    
}