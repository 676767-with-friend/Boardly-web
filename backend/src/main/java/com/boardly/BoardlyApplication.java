package com.boardly;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class BoardlyApplication {

    @Bean
    Clock boardlyClock() {
        return Clock.system(ZoneId.of("Asia/Bangkok"));
    }

    public static void main(String[] args) {
        SpringApplication.run(BoardlyApplication.class, args);
    }

}
