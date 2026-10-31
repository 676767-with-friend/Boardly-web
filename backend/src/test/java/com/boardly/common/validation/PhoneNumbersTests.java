package com.boardly.common.validation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class PhoneNumbersTests {
    private static final Pattern PHONE = Pattern.compile(PhoneNumbers.OPTIONAL_PATTERN);

    @Test
    void acceptsSupportedThaiMobileLandlineSeparatorsAndOptionalBlank() {
        for (String value : new String[] {
                "0812345678", "+66812345678", "02-123-4567", "053 123 456",
                " 081-234-5678 ", "", "   "}) {
            assertTrue(PHONE.matcher(value).matches(), value);
        }
    }

    @Test
    void rejectsTextBadLengthsPrefixesAndCountryCodes() {
        for (String value : new String[] {
                "phone", "081234", "081234567890", "0712345678", "+67812345678", "00166812345678"}) {
            assertFalse(PHONE.matcher(value).matches(), value);
        }
    }

    @Test
    void normalizesNewValuesWithoutChangingOptionalBlanks() {
        assertEquals("0812345678", PhoneNumbers.normalize(" +66 81-234-5678 "));
        assertEquals("021234567", PhoneNumbers.normalize("02-123-4567"));
        assertEquals(null, PhoneNumbers.normalize("  "));
    }
}
