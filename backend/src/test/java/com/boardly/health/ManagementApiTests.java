package com.boardly.health;

import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.actuate.observability.AutoConfigureObservability;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "management.server.port=0")
@AutoConfigureObservability(tracing = false)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ManagementApiTests {
    @Autowired TestRestTemplate rest;
    @LocalManagementPort int managementPort;

    @Test
    void metricsAreAvailableOnlyOnManagementListener() {
        var metrics = rest.getForEntity("http://localhost:" + managementPort + "/actuator/prometheus", String.class);
        assertEquals(HttpStatus.OK, metrics.getStatusCode());
        assertTrue(metrics.getBody().contains("jvm_memory_used_bytes"));
        assertNotEquals(HttpStatus.OK, rest.getForEntity("/actuator/prometheus", String.class).getStatusCode());
        assertNotEquals(HttpStatus.OK, rest.getForEntity("http://localhost:" + managementPort + "/actuator/env", String.class).getStatusCode());
    }

    @Test
    void managementHealthIncludesDatabaseWithoutExposingDetails() {
        var health = rest.getForEntity("http://localhost:" + managementPort + "/actuator/health", JsonNode.class);
        assertEquals(HttpStatus.OK, health.getStatusCode());
        assertEquals("UP", health.getBody().path("status").asText());
        assertFalse(health.getBody().has("components"));
    }
}
