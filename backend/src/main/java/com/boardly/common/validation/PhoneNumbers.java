package com.boardly.common.validation;

public final class PhoneNumbers {
    public static final String MESSAGE = "กรุณากรอกหมายเลขโทรศัพท์ไทยให้ถูกต้อง เช่น 0812345678, 02-123-4567 หรือ +66812345678";
    public static final String OPTIONAL_PATTERN = "\\s*(?:(?:0[689](?:[ -]?\\d){8}|0(?:2(?:[ -]?\\d){7}|[3-57]\\d(?:[ -]?\\d){6})|\\+66[ -]?[689](?:[ -]?\\d){8}|\\+66[ -]?(?:2(?:[ -]?\\d){7}|[3-57]\\d(?:[ -]?\\d){6})))?\\s*";

    private PhoneNumbers() {
    }

    public static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        String compact = value.trim().replace(" ", "").replace("-", "");
        return compact.startsWith("+66") ? "0" + compact.substring(3) : compact;
    }
}
