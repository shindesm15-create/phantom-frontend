package com.phantom.cat.repository;

import com.phantom.cat.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {

    User findByName(String name);
}