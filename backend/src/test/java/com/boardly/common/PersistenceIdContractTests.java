package com.boardly.common;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import com.boardly.branch.BranchGameLibraryId;
import com.boardly.branch.StoreTableFeatureId;
import com.boardly.inventory.BranchProductInventoryId;
import com.boardly.product.UserCategoryPreferenceId;
import com.boardly.product.UserFavoriteProductId;
import com.boardly.user.StaffBranchAssignmentId;
import com.boardly.user.UserRoleId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PersistenceIdContractTests {

    @Test
    void compositeIdsUseBothDatabaseKeysForEqualityAndHashing() {
        UUID left = UUID.randomUUID();
        UUID right = UUID.randomUUID();
        List<Object[]> equalPairs = List.of(
                pair(new UserFavoriteProductId(left, right), new UserFavoriteProductId(left, right)),
                pair(new UserCategoryPreferenceId(left, right), new UserCategoryPreferenceId(left, right)),
                pair(new StoreTableFeatureId(left, right), new StoreTableFeatureId(left, right)),
                pair(new BranchGameLibraryId(left, right), new BranchGameLibraryId(left, right)),
                pair(new BranchProductInventoryId(left, right), new BranchProductInventoryId(left, right)),
                pair(new UserRoleId(left, right), new UserRoleId(left, right)),
                pair(new StaffBranchAssignmentId(left, right), new StaffBranchAssignmentId(left, right)));

        equalPairs.forEach(pair -> assertAll(
                () -> assertEquals(pair[0], pair[1]),
                () -> assertEquals(pair[0].hashCode(), pair[1].hashCode()),
                () -> assertNotEquals(pair[0], null),
                () -> assertNotEquals(pair[0], "not-an-id")));

        assertNotEquals(
                new UserFavoriteProductId(left, right),
                new UserFavoriteProductId(left, UUID.randomUUID()));
    }

    private Object[] pair(Object left, Object right) {
        return new Object[] { left, right };
    }
}
