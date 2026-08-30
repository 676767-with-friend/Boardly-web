package com.boardly.user;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRoleRepository extends JpaRepository<UserRole, UserRoleId> {

    @Query("select r.code from UserRole ur join ur.role r where ur.user.id = :userId and r.isActive = true")
    List<String> findActiveRoleCodesByUserId(UUID userId);

    @Query(value = """
            select distinct p.code
            from user_roles ur
            join roles r on r.id = ur.role_id and r.is_active = true
            join role_permissions rp on rp.role_id = r.id
            join permissions p on p.id = rp.permission_id
            where ur.user_id = :userId
            """, nativeQuery = true)
    List<String> findPermissionCodesByUserId(UUID userId);
}
