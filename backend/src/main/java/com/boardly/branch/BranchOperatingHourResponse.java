package com.boardly.branch;

import java.time.LocalTime;

public record BranchOperatingHourResponse(short dayOfWeek, LocalTime openTime, LocalTime closeTime, boolean closed) {
}
