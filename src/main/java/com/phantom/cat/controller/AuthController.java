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
public ResponseEntity<String> login(@RequestBody User user) {

    String result = service.login(user.getName(), user.getPassword());

    return ResponseEntity.ok(result);
}
   

    @PostMapping("/register")
    public String register(@RequestBody User user) {
        return service.createUser(user.getName(), user.getPassword());
    }

   
    
}