package com.boardly;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

@SpringBootTest
class BoardlyApplicationTests {
    @Autowired private Environment environment;

    @Test
    void contextLoads() {
        assertTrue(Arrays.asList(environment.getActiveProfiles()).contains("test"));
        assertFalse(environment.getProperty(
                "boardly.auth.dev-reset-token-exposure", Boolean.class, true));
    }

}
