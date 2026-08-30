package com.boardly.branch;

import com.boardly.common.exception.BoardlyException;
import com.boardly.product.ProductMediaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class BranchReadService {

    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("HH:mm");

    private final BranchRepository branchRepository;
    private final BranchOperatingHourRepository hourRepository;
    private final BranchAmenityRepository amenityRepository;
    private final BranchRuleRepository ruleRepository;
    private final StoreTableRepository tableRepository;
    private final BranchGameLibraryRepository gameLibraryRepository;
    private final ProductMediaRepository mediaRepository;

    public BranchReadService(BranchRepository branchRepository, BranchOperatingHourRepository hourRepository,
                             BranchAmenityRepository amenityRepository, BranchRuleRepository ruleRepository,
                             StoreTableRepository tableRepository, BranchGameLibraryRepository gameLibraryRepository,
                             ProductMediaRepository mediaRepository) {
        this.branchRepository = branchRepository;
        this.hourRepository = hourRepository;
        this.amenityRepository = amenityRepository;
        this.ruleRepository = ruleRepository;
        this.tableRepository = tableRepository;
        this.gameLibraryRepository = gameLibraryRepository;
        this.mediaRepository = mediaRepository;
    }

    public List<BranchResponse> branches() {
        return branchRepository.findAll().stream()
                .sorted(Comparator.comparing(Branch::getName))
                .map(this::toResponse)
                .toList();
    }

    public BranchDetailResponse branch(UUID id) {
        Branch branch = requiredBranch(id);
        List<BranchOperatingHourResponse> hours = operatingHours(id);
        return new BranchDetailResponse(
                branch.getId(), branch.getCode(), branch.getName(), branch.getAddressLine1(), branch.getDistrict(),
                branch.getProvince(), branch.getPostalCode(), branch.getPhone(), branch.getStatus().name(), branch.isAllowReservations(),
                hoursLabel(hours), tableRepository.countByBranchIdAndIsActiveTrue(id), gameLibraryRepository.findByBranchIdAndAvailableTrue(id).size(),
                hours,
                amenityRepository.findByBranchIdOrderBySortOrderAsc(id).stream().map(BranchAmenity::getAmenityText).toList(),
                ruleRepository.findByBranchIdOrderBySortOrderAsc(id).stream().map(BranchRule::getRuleText).toList()
        );
    }

    public List<BranchTableResponse> tables(UUID id) {
        requiredBranch(id);
        return tableRepository.findByBranchIdAndIsActiveTrueOrderBySortOrderAsc(id).stream()
                .map(table -> new BranchTableResponse(table.getId(), table.getCode(), table.getZone().getName(), table.getMinPlayers(), table.getMaxPlayers(), table.getOperationalStatus().name()))
                .toList();
    }

    public List<BranchGameResponse> games(UUID id) {
        requiredBranch(id);
        return gameLibraryRepository.findByBranchIdAndAvailableTrue(id).stream()
                .sorted(Comparator.comparing(item -> item.getProduct().getName()))
                .map(game -> new BranchGameResponse(
                        game.getProduct().getId(),
                        game.getProduct().getName(),
                        mediaRepository.findByProductIdOrderBySortOrderAsc(game.getProduct().getId()).stream()
                                .filter(media -> media.isPrimary()).map(media -> media.getMediaUrl()).findFirst().orElse(null),
                        game.getPlayableCopies()
                ))
                .toList();
    }

    private BranchResponse toResponse(Branch branch) {
        List<BranchOperatingHourResponse> hours = operatingHours(branch.getId());
        return new BranchResponse(
                branch.getId(), branch.getCode(), branch.getName(), branch.getAddressLine1(), branch.getDistrict(),
                branch.getProvince(), branch.getPostalCode(), branch.getPhone(), branch.getStatus().name(), branch.isAllowReservations(),
                hoursLabel(hours), tableRepository.countByBranchIdAndIsActiveTrue(branch.getId()), gameLibraryRepository.findByBranchIdAndAvailableTrue(branch.getId()).size()
        );
    }

    private List<BranchOperatingHourResponse> operatingHours(UUID branchId) {
        return hourRepository.findByBranchIdOrderByDayOfWeekAsc(branchId).stream()
                .map(hour -> new BranchOperatingHourResponse(hour.getDayOfWeek(), hour.getOpenTime(), hour.getCloseTime(), hour.isClosed()))
                .toList();
    }

    private String hoursLabel(List<BranchOperatingHourResponse> hours) {
        return hours.stream().filter(hour -> !hour.closed()).findFirst()
                .map(hour -> format(hour.openTime()) + "-" + format(hour.closeTime()))
                .orElse("Closed");
    }

    private String format(LocalTime value) {
        return value.format(TIME_FORMAT);
    }

    private Branch requiredBranch(UUID id) {
        return branchRepository.findById(id)
                .orElseThrow(() -> new BoardlyException("Branch not found", HttpStatus.NOT_FOUND.value()));
    }
}
