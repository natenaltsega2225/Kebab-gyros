USE kebab_gyros;

-- Run this only if you previously installed the earlier backend schema.
ALTER TABLE admin_users
  ADD COLUMN username VARCHAR(60) NULL AFTER id,
  ADD COLUMN full_name VARCHAR(120) NULL AFTER email,
  ADD COLUMN role ENUM('admin','manager') NOT NULL DEFAULT 'manager' AFTER full_name,
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1 AFTER password_hash,
  ADD COLUMN failed_login_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN locked_until DATETIME NULL AFTER failed_login_count,
  ADD COLUMN password_changed_at DATETIME NULL AFTER last_login_at;

UPDATE admin_users
SET username = CONCAT('admin', id), full_name = COALESCE(full_name, 'Administrator')
WHERE username IS NULL OR username='';

ALTER TABLE admin_users
  MODIFY username VARCHAR(60) NOT NULL,
  MODIFY full_name VARCHAR(120) NOT NULL,
  ADD UNIQUE KEY uq_admin_username(username);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,user_id BIGINT UNSIGNED NOT NULL,jti CHAR(36) NOT NULL,
  ip_address VARCHAR(64) NULL,user_agent VARCHAR(500) NULL,expires_at DATETIME NOT NULL,revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_session_jti(jti),KEY idx_sessions_user(user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,user_id BIGINT UNSIGNED NOT NULL,token_hash CHAR(64) NOT NULL,expires_at DATETIME NOT NULL,used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(id),UNIQUE KEY uq_reset_token_hash(token_hash),KEY idx_reset_user(user_id),
  CONSTRAINT fk_reset_user FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,restaurant_name VARCHAR(160) NOT NULL,address_line_1 VARCHAR(190) NOT NULL,address_line_2 VARCHAR(190) NULL,
  city VARCHAR(100) NOT NULL,state VARCHAR(100) NOT NULL,zip_code VARCHAR(20) NOT NULL,phone VARCHAR(40) NOT NULL,email VARCHAR(190) NOT NULL,
  google_maps_url VARCHAR(1000) NULL,order_online_url VARCHAR(1000) NULL,logo_url VARCHAR(1000) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,user_id BIGINT UNSIGNED NULL,action VARCHAR(80) NOT NULL,entity_type VARCHAR(80) NOT NULL,entity_id VARCHAR(80) NULL,
  details_json JSON NULL,ip_address VARCHAR(64) NULL,user_agent VARCHAR(500) NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id),KEY idx_audit_created(created_at),KEY idx_audit_user(user_id),CONSTRAINT fk_audit_user FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;
INSERT INTO restaurant_settings(id,restaurant_name,address_line_1,address_line_2,city,state,zip_code,phone,email)
VALUES(1,'Kebab Gyros','389 Murfreesboro Pike',NULL,'Nashville','TN','37210','(615) 333-3711','info@kebabgyronashville.com')
ON DUPLICATE KEY UPDATE id=id;
