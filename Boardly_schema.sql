-- Boardly PostgreSQL Schema
-- Target: PostgreSQL 18
-- Intended database: boardly_db (fresh database)
-- Source: Boardly_Database_Schema_Analysis.md
--
-- Notes:
--   * This file is a fresh-schema installer, not a migration script.
--   * It intentionally does not DROP existing objects.
--   * Run it while connected to boardly_db in pgAdmin Query Tool.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE consent_document_type_enum AS ENUM ('terms', 'privacy');
CREATE TYPE product_difficulty_enum AS ENUM ('easy', 'medium', 'advanced', 'expert');
CREATE TYPE media_type_enum AS ENUM ('image', 'video');
CREATE TYPE review_status_enum AS ENUM ('pending', 'published', 'hidden');
CREATE TYPE branch_status_enum AS ENUM ('active', 'inactive');
CREATE TYPE table_operational_status_enum AS ENUM ('available', 'unavailable');
CREATE TYPE reservation_status_enum AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show');
CREATE TYPE play_session_status_enum AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE cart_status_enum AS ENUM ('active', 'converted', 'abandoned');
CREATE TYPE order_status_enum AS ENUM ('new', 'processing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
CREATE TYPE inventory_movement_type_enum AS ENUM ('restock', 'sale', 'return', 'adjustment', 'reserve', 'release');

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- MASTER TABLES
-- ============================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(30) NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT ck_product_categories_sort_order_nonnegative CHECK (sort_order >= 0)
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    province VARCHAR(100),
    postal_code VARCHAR(20),
    phone VARCHAR(30),
    status branch_status_enum NOT NULL DEFAULT 'active',
    allow_reservations BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE table_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE fulfillment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    base_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
    eta_min_days SMALLINT,
    eta_max_days SMALLINT,
    is_store_pickup BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_fulfillment_base_fee_nonnegative CHECK (base_fee >= 0),
    CONSTRAINT ck_fulfillment_eta_min_nonnegative CHECK (eta_min_days IS NULL OR eta_min_days >= 0),
    CONSTRAINT ck_fulfillment_eta_max_nonnegative CHECK (eta_max_days IS NULL OR eta_max_days >= 0),
    CONSTRAINT ck_fulfillment_eta_range CHECK (
        eta_min_days IS NULL OR eta_max_days IS NULL OR eta_max_days >= eta_min_days
    )
);

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- AUTHENTICATION / AUTHORIZATION
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    password_hash VARCHAR(255) NOT NULL,
    status user_status_enum NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Login email uniqueness should be case-insensitive.
CREATE UNIQUE INDEX uq_users_email_lower ON users (LOWER(email));

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    remember_me BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_auth_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_auth_sessions_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_auth_sessions_revoked CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT ck_password_reset_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_password_reset_used CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    document_type consent_document_type_enum NOT NULL,
    document_version VARCHAR(50) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_consents_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE staff_branch_assignments (
    user_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, branch_id),
    CONSTRAINT fk_staff_branch_assignments_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_staff_branch_assignments_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_staff_branch_assignments_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_staff_primary_branch
ON staff_branch_assignments (user_id)
WHERE is_primary;

-- ============================================================
-- PRODUCT CATALOG
-- ============================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id UUID NOT NULL,
    base_price NUMERIC(10,2) NOT NULL,
    sale_price NUMERIC(10,2),
    min_players SMALLINT NOT NULL,
    max_players SMALLINT NOT NULL,
    min_play_time_minutes SMALLINT,
    max_play_time_minutes SMALLINT,
    min_age SMALLINT,
    difficulty product_difficulty_enum NOT NULL,
    publisher_name VARCHAR(255),
    designer_name VARCHAR(255),
    languages_text VARCHAR(255),
    description TEXT,
    published_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE RESTRICT,
    CONSTRAINT ck_products_base_price_nonnegative CHECK (base_price >= 0),
    CONSTRAINT ck_products_sale_price_nonnegative CHECK (sale_price IS NULL OR sale_price >= 0),
    CONSTRAINT ck_products_players_min_positive CHECK (min_players > 0),
    CONSTRAINT ck_products_players_range CHECK (max_players >= min_players),
    CONSTRAINT ck_products_play_time_min_positive CHECK (
        min_play_time_minutes IS NULL OR min_play_time_minutes > 0
    ),
    CONSTRAINT ck_products_play_time_max_positive CHECK (
        max_play_time_minutes IS NULL OR max_play_time_minutes > 0
    ),
    CONSTRAINT ck_products_play_time_range CHECK (
        min_play_time_minutes IS NULL OR max_play_time_minutes IS NULL
        OR max_play_time_minutes >= min_play_time_minutes
    ),
    CONSTRAINT ck_products_min_age_nonnegative CHECK (min_age IS NULL OR min_age >= 0)
);

CREATE TABLE product_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    media_url TEXT NOT NULL,
    media_type media_type_enum NOT NULL DEFAULT 'image',
    alt_text VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_product_media_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT ck_product_media_sort_order_nonnegative CHECK (sort_order >= 0)
);

CREATE UNIQUE INDEX uq_product_media_primary
ON product_media (product_id)
WHERE is_primary;

CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    user_id UUID,
    rating SMALLINT NOT NULL,
    review_text TEXT,
    status review_status_enum NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_product_reviews_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_reviews_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_product_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE user_favorite_products (
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id),
    CONSTRAINT fk_user_favorite_products_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_favorite_products_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE user_category_preferences (
    user_id UUID NOT NULL,
    category_id UUID NOT NULL,
    PRIMARY KEY (user_id, category_id),
    CONSTRAINT fk_user_category_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_category_preferences_category
        FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE
);

-- ============================================================
-- BRANCH / STORE
-- ============================================================

CREATE TABLE branch_operating_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    day_of_week SMALLINT NOT NULL,
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_branch_operating_hours_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT uq_branch_operating_hours UNIQUE (branch_id, day_of_week),
    CONSTRAINT ck_branch_operating_hours_day CHECK (day_of_week BETWEEN 0 AND 6)
);

CREATE TABLE branch_amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    amenity_text VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_branch_amenities_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT ck_branch_amenities_sort_order_nonnegative CHECK (sort_order >= 0)
);

CREATE TABLE branch_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    rule_text TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_branch_rules_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT ck_branch_rules_sort_order_nonnegative CHECK (sort_order >= 0)
);

CREATE TABLE table_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_table_zones_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT uq_table_zones_branch_name UNIQUE (branch_id, name),
    CONSTRAINT uq_table_zones_id_branch UNIQUE (id, branch_id),
    CONSTRAINT ck_table_zones_sort_order_nonnegative CHECK (sort_order >= 0)
);

CREATE TABLE store_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    code VARCHAR(30) NOT NULL,
    zone_id UUID NOT NULL,
    min_players SMALLINT NOT NULL DEFAULT 1,
    max_players SMALLINT NOT NULL,
    operational_status table_operational_status_enum NOT NULL DEFAULT 'available',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_store_tables_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_store_tables_zone_branch
        FOREIGN KEY (zone_id, branch_id) REFERENCES table_zones(id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT uq_store_tables_branch_code UNIQUE (branch_id, code),
    CONSTRAINT uq_store_tables_id_branch UNIQUE (id, branch_id),
    CONSTRAINT ck_store_tables_min_players_positive CHECK (min_players > 0),
    CONSTRAINT ck_store_tables_players_range CHECK (max_players >= min_players),
    CONSTRAINT ck_store_tables_sort_order_nonnegative CHECK (sort_order >= 0)
);

CREATE TABLE store_table_features (
    table_id UUID NOT NULL,
    feature_id UUID NOT NULL,
    PRIMARY KEY (table_id, feature_id),
    CONSTRAINT fk_store_table_features_table
        FOREIGN KEY (table_id) REFERENCES store_tables(id) ON DELETE CASCADE,
    CONSTRAINT fk_store_table_features_feature
        FOREIGN KEY (feature_id) REFERENCES table_features(id) ON DELETE CASCADE
);

CREATE TABLE branch_game_library (
    branch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    playable_copies INT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (branch_id, product_id),
    CONSTRAINT fk_branch_game_library_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_branch_game_library_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT ck_branch_game_library_playable_copies CHECK (
        playable_copies IS NULL OR playable_copies >= 0
    )
);

CREATE TABLE branch_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    first_hour_per_person NUMERIC(10,2) NOT NULL,
    additional_hour_per_person NUMERIC(10,2) NOT NULL,
    child_hour_per_person NUMERIC(10,2),
    child_age_under SMALLINT,
    currency CHAR(3) NOT NULL DEFAULT 'THB',
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    CONSTRAINT fk_branch_pricing_rules_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT uq_branch_pricing_rules_id_branch UNIQUE (id, branch_id),
    CONSTRAINT ck_branch_pricing_first_hour_nonnegative CHECK (first_hour_per_person >= 0),
    CONSTRAINT ck_branch_pricing_additional_hour_nonnegative CHECK (additional_hour_per_person >= 0),
    CONSTRAINT ck_branch_pricing_child_hour_nonnegative CHECK (
        child_hour_per_person IS NULL OR child_hour_per_person >= 0
    ),
    CONSTRAINT ck_branch_pricing_child_age_nonnegative CHECK (
        child_age_under IS NULL OR child_age_under >= 0
    ),
    CONSTRAINT ck_branch_pricing_effective_range CHECK (
        effective_to IS NULL OR effective_to > effective_from
    ),
    CONSTRAINT ck_branch_pricing_currency CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE TABLE booking_blackouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    table_id UUID,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    created_by UUID,
    CONSTRAINT fk_booking_blackouts_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_blackouts_table_branch
        FOREIGN KEY (table_id, branch_id) REFERENCES store_tables(id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_blackouts_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_booking_blackouts_time_range CHECK (ends_at > starts_at)
);

-- ============================================================
-- RESERVATION / CAFE
-- ============================================================

CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_number VARCHAR(30) NOT NULL UNIQUE,
    user_id UUID,
    branch_id UUID NOT NULL,
    table_id UUID NOT NULL,
    pricing_rule_id UUID,
    contact_name VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(30),
    contact_email VARCHAR(255),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    player_count SMALLINT NOT NULL,
    status reservation_status_enum NOT NULL DEFAULT 'pending',
    estimated_fee NUMERIC(10,2),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reservations_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_reservations_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_table_branch
        FOREIGN KEY (table_id, branch_id) REFERENCES store_tables(id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_pricing_rule_branch
        FOREIGN KEY (pricing_rule_id, branch_id) REFERENCES branch_pricing_rules(id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT fk_reservations_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_reservations_time_range CHECK (ends_at > starts_at),
    CONSTRAINT ck_reservations_player_count_positive CHECK (player_count > 0),
    CONSTRAINT ck_reservations_estimated_fee_nonnegative CHECK (
        estimated_fee IS NULL OR estimated_fee >= 0
    ),
    CONSTRAINT ck_reservations_cancelled_time CHECK (
        cancelled_at IS NULL OR cancelled_at >= created_at
    )
);

CREATE TABLE play_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID,
    branch_id UUID NOT NULL,
    table_id UUID NOT NULL,
    user_id UUID,
    guest_name VARCHAR(200),
    guest_phone VARCHAR(30),
    guest_email VARCHAR(255),
    player_count SMALLINT NOT NULL,
    pricing_rule_id UUID,
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_at TIMESTAMPTZ,
    status play_session_status_enum NOT NULL DEFAULT 'active',
    final_fee NUMERIC(10,2),
    created_by UUID,
    closed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_play_sessions_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
    CONSTRAINT fk_play_sessions_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_play_sessions_table_branch
        FOREIGN KEY (table_id, branch_id) REFERENCES store_tables(id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT fk_play_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_play_sessions_pricing_rule_branch
        FOREIGN KEY (pricing_rule_id, branch_id) REFERENCES branch_pricing_rules(id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT fk_play_sessions_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_play_sessions_closed_by
        FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_play_sessions_player_count_positive CHECK (player_count > 0),
    CONSTRAINT ck_play_sessions_checkout_time CHECK (
        check_out_at IS NULL OR check_out_at >= check_in_at
    ),
    CONSTRAINT ck_play_sessions_final_fee_nonnegative CHECK (
        final_fee IS NULL OR final_fee >= 0
    )
);

CREATE UNIQUE INDEX uq_play_sessions_reservation
ON play_sessions (reservation_id)
WHERE reservation_id IS NOT NULL;

-- ============================================================
-- SHOPPING CART
-- ============================================================

CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    guest_session_key VARCHAR(255) UNIQUE,
    status cart_status_enum NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_carts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_carts_owner CHECK (user_id IS NOT NULL OR guest_session_key IS NOT NULL),
    CONSTRAINT ck_carts_expiry CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_cart_items_cart
        FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT uq_cart_items_cart_product UNIQUE (cart_id, product_id),
    CONSTRAINT ck_cart_items_quantity_positive CHECK (quantity > 0)
);

-- ============================================================
-- ORDERS / PAYMENTS
-- ============================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) NOT NULL UNIQUE,
    user_id UUID,
    fulfillment_method_id UUID NOT NULL,
    pickup_branch_id UUID,
    status order_status_enum NOT NULL DEFAULT 'new',
    contact_first_name VARCHAR(100) NOT NULL,
    contact_last_name VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(30),
    shipping_address VARCHAR(255),
    shipping_district VARCHAR(100),
    shipping_province VARCHAR(100),
    shipping_postal_code VARCHAR(20),
    subtotal NUMERIC(12,2) NOT NULL,
    shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'THB',
    estimated_delivery_date DATE,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_fulfillment_method
        FOREIGN KEY (fulfillment_method_id) REFERENCES fulfillment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_pickup_branch
        FOREIGN KEY (pickup_branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT ck_orders_subtotal_nonnegative CHECK (subtotal >= 0),
    CONSTRAINT ck_orders_shipping_fee_nonnegative CHECK (shipping_fee >= 0),
    CONSTRAINT ck_orders_total_amount_nonnegative CHECK (total_amount >= 0),
    CONSTRAINT ck_orders_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_orders_cancelled_time CHECK (cancelled_at IS NULL OR cancelled_at >= placed_at)
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID,
    product_name_snapshot VARCHAR(255) NOT NULL,
    sku_snapshot VARCHAR(100),
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    line_total NUMERIC(12,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT ck_order_items_unit_price_nonnegative CHECK (unit_price >= 0),
    CONSTRAINT ck_order_items_quantity_positive CHECK (quantity > 0)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    payment_method_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'THB',
    status payment_status_enum NOT NULL DEFAULT 'pending',
    provider_reference VARCHAR(255) UNIQUE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_payment_method
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT ck_payments_amount_nonnegative CHECK (amount >= 0),
    CONSTRAINT ck_payments_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT ck_payments_paid_time CHECK (paid_at IS NULL OR paid_at >= created_at)
);

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE branch_product_inventory (
    branch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reserved_quantity INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 3,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (branch_id, product_id),
    CONSTRAINT fk_branch_product_inventory_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_branch_product_inventory_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT ck_branch_product_inventory_quantity_on_hand CHECK (quantity_on_hand >= 0),
    CONSTRAINT ck_branch_product_inventory_reserved_quantity CHECK (reserved_quantity >= 0),
    CONSTRAINT ck_branch_product_inventory_low_stock_threshold CHECK (low_stock_threshold >= 0),
    CONSTRAINT ck_branch_product_inventory_reserved_not_overstock CHECK (
        reserved_quantity <= quantity_on_hand
    )
);

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL,
    product_id UUID NOT NULL,
    movement_type inventory_movement_type_enum NOT NULL,
    quantity_delta INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    note TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_inventory_movements_branch
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movements_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movements_created_by
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ck_inventory_movements_quantity_delta_nonzero CHECK (quantity_delta <> 0)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Authentication / authorization
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
CREATE INDEX idx_user_roles_assigned_by ON user_roles (assigned_by);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions (permission_id);
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions (user_id);
CREATE INDEX idx_auth_sessions_user_active ON auth_sessions (user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX idx_user_consents_user_id ON user_consents (user_id);
CREATE INDEX idx_staff_branch_assignments_branch_id ON staff_branch_assignments (branch_id);
CREATE INDEX idx_staff_branch_assignments_assigned_by ON staff_branch_assignments (assigned_by);

-- Product catalog
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_active_name ON products (is_active, name);
CREATE INDEX idx_product_media_product_id ON product_media (product_id);
CREATE INDEX idx_product_reviews_product_status ON product_reviews (product_id, status);
CREATE INDEX idx_product_reviews_user_id ON product_reviews (user_id);
CREATE INDEX idx_user_favorite_products_product_id ON user_favorite_products (product_id);
CREATE INDEX idx_user_category_preferences_category_id ON user_category_preferences (category_id);

-- Branch / store
CREATE INDEX idx_branch_operating_hours_branch_id ON branch_operating_hours (branch_id);
CREATE INDEX idx_branch_amenities_branch_id ON branch_amenities (branch_id);
CREATE INDEX idx_branch_rules_branch_id ON branch_rules (branch_id);
CREATE INDEX idx_table_zones_branch_id ON table_zones (branch_id);
CREATE INDEX idx_store_tables_branch_zone ON store_tables (branch_id, zone_id);
CREATE INDEX idx_store_tables_branch_active ON store_tables (branch_id, is_active, operational_status);
CREATE INDEX idx_store_table_features_feature_id ON store_table_features (feature_id);
CREATE INDEX idx_branch_game_library_product_id ON branch_game_library (product_id);
CREATE INDEX idx_branch_pricing_rules_branch_effective ON branch_pricing_rules (branch_id, effective_from DESC);
CREATE INDEX idx_booking_blackouts_branch_time ON booking_blackouts (branch_id, starts_at, ends_at);
CREATE INDEX idx_booking_blackouts_table_time ON booking_blackouts (table_id, starts_at, ends_at) WHERE table_id IS NOT NULL;
CREATE INDEX idx_booking_blackouts_created_by ON booking_blackouts (created_by);

-- Reservation / cafe
CREATE INDEX idx_reservations_user_id ON reservations (user_id);
CREATE INDEX idx_reservations_branch_start ON reservations (branch_id, starts_at);
CREATE INDEX idx_reservations_table_start ON reservations (table_id, starts_at);
CREATE INDEX idx_reservations_status_start ON reservations (status, starts_at);
CREATE INDEX idx_reservations_pricing_rule_id ON reservations (pricing_rule_id);
CREATE INDEX idx_reservations_created_by ON reservations (created_by);
CREATE INDEX idx_play_sessions_branch_status ON play_sessions (branch_id, status);
CREATE INDEX idx_play_sessions_table_status ON play_sessions (table_id, status);
CREATE INDEX idx_play_sessions_user_id ON play_sessions (user_id);
CREATE INDEX idx_play_sessions_pricing_rule_id ON play_sessions (pricing_rule_id);
CREATE INDEX idx_play_sessions_created_by ON play_sessions (created_by);
CREATE INDEX idx_play_sessions_closed_by ON play_sessions (closed_by);
CREATE INDEX idx_play_sessions_active_branch_table ON play_sessions (branch_id, table_id) WHERE status = 'active';

-- Shopping
CREATE INDEX idx_carts_user_status ON carts (user_id, status);
CREATE INDEX idx_carts_status_expires ON carts (status, expires_at);
CREATE INDEX idx_cart_items_product_id ON cart_items (product_id);

-- Orders / payments
CREATE INDEX idx_orders_user_placed ON orders (user_id, placed_at DESC);
CREATE INDEX idx_orders_status_placed ON orders (status, placed_at DESC);
CREATE INDEX idx_orders_fulfillment_method_id ON orders (fulfillment_method_id);
CREATE INDEX idx_orders_pickup_branch_id ON orders (pickup_branch_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);
CREATE INDEX idx_payments_order_id ON payments (order_id);
CREATE INDEX idx_payments_status_created ON payments (status, created_at DESC);
CREATE INDEX idx_payments_payment_method_id ON payments (payment_method_id);

-- Inventory
CREATE INDEX idx_branch_product_inventory_product_id ON branch_product_inventory (product_id);
CREATE INDEX idx_inventory_movements_branch_product_created
    ON inventory_movements (branch_id, product_id, created_at DESC);
CREATE INDEX idx_inventory_movements_product_created
    ON inventory_movements (product_id, created_at DESC);
CREATE INDEX idx_inventory_movements_created_by ON inventory_movements (created_by);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_branches_set_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_store_tables_set_updated_at
BEFORE UPDATE ON store_tables
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reservations_set_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_carts_set_updated_at
BEFORE UPDATE ON carts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cart_items_set_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_branch_product_inventory_set_updated_at
BEFORE UPDATE ON branch_product_inventory
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SOURCE-SUPPORTED SEED DATA
-- ============================================================

INSERT INTO roles (code, name)
VALUES
    ('customer', 'Customer'),
    ('staff', 'Staff'),
    ('admin', 'Admin')
ON CONFLICT (code) DO NOTHING;

INSERT INTO fulfillment_methods (code, name, base_fee, is_store_pickup)
VALUES
    ('standard', 'Standard', 0, FALSE),
    ('express', 'Express', 0, FALSE),
    ('pickup', 'Pickup', 0, TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO payment_methods (code, name)
VALUES
    ('card', 'Card'),
    ('promptpay', 'PromptPay'),
    ('bank_transfer', 'Bank Transfer')
ON CONFLICT (code) DO NOTHING;

COMMIT;
