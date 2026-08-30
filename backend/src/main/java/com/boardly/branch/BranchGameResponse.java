package com.boardly.branch;

import java.util.UUID;

public record BranchGameResponse(UUID productId, String name, String image, Integer playableCopies) {
}
