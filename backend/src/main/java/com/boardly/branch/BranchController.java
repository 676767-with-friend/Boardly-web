package com.boardly.branch;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchReadService branchReadService;

    public BranchController(BranchReadService branchReadService) {
        this.branchReadService = branchReadService;
    }

    @GetMapping
    public List<BranchResponse> branches() {
        return branchReadService.branches();
    }

    @GetMapping("/{id}")
    public BranchDetailResponse branch(@PathVariable UUID id) {
        return branchReadService.branch(id);
    }

    @GetMapping("/{id}/tables")
    public List<BranchTableResponse> tables(@PathVariable UUID id) {
        return branchReadService.tables(id);
    }

    @GetMapping("/{id}/games")
    public List<BranchGameResponse> games(@PathVariable UUID id) {
        return branchReadService.games(id);
    }
}
