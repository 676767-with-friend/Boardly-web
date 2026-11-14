package com.boardly.config;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

import static org.junit.jupiter.api.Assertions.*;

class RequestLoggingFilterTests {
    @Test
    void logsTemplateAndStatusWithoutCredentialsOrRawUrl() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            var request = new MockHttpServletRequest("GET", "/api/products/private-id");
            request.setQueryString("token=secret-query");
            request.addHeader("Authorization", "Bearer secret-header");
            request.setContent("secret-body".getBytes());
            var response = new MockHttpServletResponse();
            new RequestLoggingFilter().doFilter(request, response, (req, res) -> {
                req.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/products/{id}");
                ((MockHttpServletResponse) res).setStatus(404);
            });
            assertEquals(1, appender.list.size());
            String message = appender.list.getFirst().getFormattedMessage();
            assertTrue(message.contains("route=/api/products/{id} status=404"));
            assertFalse(message.contains("secret"));
            assertFalse(message.contains("private-id"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
