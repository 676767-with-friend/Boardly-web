package com.boardly.branch;

import java.util.UUID;

public record BranchTableResponse(UUID id, String code, String zone, short minPlayers, short maxPlayers, String status) {
}
