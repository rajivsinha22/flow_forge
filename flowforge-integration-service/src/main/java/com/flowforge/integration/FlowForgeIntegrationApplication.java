package com.flowforge.integration;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FlowForgeIntegrationApplication {

    public static void main(String[] args) {
        SpringApplication.run(FlowForgeIntegrationApplication.class, args);
    }
}
