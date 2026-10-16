BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    recipient_user_id UUID,
    recipient_branch_id UUID,
    recipient_address VARCHAR(255),
    subject VARCHAR(255),
    body TEXT NOT NULL,
    reservation_id UUID,
    play_session_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    attempt_count SMALLINT NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_notifications_branch
        FOREIGN KEY (recipient_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    CONSTRAINT fk_notifications_reservation
        FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
    CONSTRAINT fk_notifications_play_session
        FOREIGN KEY (play_session_id) REFERENCES play_sessions(id) ON DELETE SET NULL,
    CONSTRAINT ck_notifications_status
        CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    CONSTRAINT ck_notifications_has_recipient
        CHECK (recipient_user_id IS NOT NULL
            OR recipient_branch_id IS NOT NULL
            OR recipient_address IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_notifications_due
ON notifications (scheduled_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_user_inbox
ON notifications (recipient_user_id, scheduled_at DESC) WHERE channel = 'in_app';

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_reservation_reminder
ON notifications (reservation_id, type, channel, scheduled_at)
WHERE reservation_id IS NOT NULL;

COMMIT;
