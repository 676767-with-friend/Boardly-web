package com.boardly.branch;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BranchReadApiTests {

    private static final String CENTRAL_ID = "50000000-0000-0000-0000-000000000001";
    private static final String SILOM_ID = "50000000-0000-0000-0000-000000000002";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listsBranches() throws Exception {
        mockMvc.perform(get("/api/branches").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Central Branch"))
                .andExpect(jsonPath("$[0].tableCount").value(2));
    }

    @Test
    void returnsBranchDetailWithAggregates() throws Exception {
        mockMvc.perform(get("/api/branches/{id}", CENTRAL_ID).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Central Branch"))
                .andExpect(jsonPath("$.operatingHours.length()").value(7))
                .andExpect(jsonPath("$.operatingHours[4].openTime").value("10:00:00"))
                .andExpect(jsonPath("$.operatingHours[4].closeTime").value("23:00:00"))
                .andExpect(jsonPath("$.amenities.length()").value(2))
                .andExpect(jsonPath("$.rules.length()").value(2))
                .andExpect(jsonPath("$.playableGameCount").value(3));
    }

    @Test
    void returnsBranchSpecificOperatingHoursIncludingClosedDays() throws Exception {
        mockMvc.perform(get("/api/branches/{id}", SILOM_ID).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.operatingHours[0].openTime").value("11:00:00"))
                .andExpect(jsonPath("$.operatingHours[6].closed").value(true))
                .andExpect(jsonPath("$.operatingHours[6].openTime").doesNotExist())
                .andExpect(jsonPath("$.operatingHours[6].closeTime").doesNotExist());
    }

    @Test
    void returnsBranchTablesAndGames() throws Exception {
        mockMvc.perform(get("/api/branches/{id}/tables", CENTRAL_ID).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("A1"));

        mockMvc.perform(get("/api/branches/{id}/games", CENTRAL_ID).accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Azul"));
    }
}
