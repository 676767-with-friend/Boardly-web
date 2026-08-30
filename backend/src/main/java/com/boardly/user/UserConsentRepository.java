package com.boardly.user;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserConsentRepository extends JpaRepository<UserConsent, UUID> {
}
