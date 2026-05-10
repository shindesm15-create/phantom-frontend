package com.phantom.cat.repository;

import com.phantom.cat.model.Catm;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CatmRepository
        extends MongoRepository<Catm,String> {

    List<Catm> findByFromAndTo(
            String from,
            String to
    );
}