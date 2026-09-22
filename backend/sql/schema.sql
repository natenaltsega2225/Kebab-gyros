CREATE DATABASE IF NOT EXISTS kebab_gyros CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kebab_gyros;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(60) NOT NULL,
  email VARCHAR(190) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('admin','manager') NOT NULL DEFAULT 'manager',
  password_hash VARCHAR(255) NOT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  last_login_at DATETIME NULL,
  password_changed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_admin_username(username), UNIQUE KEY uq_admin_email(email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  jti CHAR(36) NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_session_jti(jti), KEY idx_sessions_user(user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_reset_token_hash(token_hash), KEY idx_reset_user(user_id),
  CONSTRAINT fk_reset_user FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL, slug VARCHAR(80) NOT NULL, sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_category_name(name), UNIQUE KEY uq_category_slug(slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL, description VARCHAR(1000) NULL, price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(1000) NULL, is_popular TINYINT(1) NOT NULL DEFAULT 0, is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), KEY idx_menu_items_category(category_id), KEY idx_menu_items_popular(is_popular,is_active),
  CONSTRAINT fk_menu_items_category FOREIGN KEY(category_id) REFERENCES menu_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS restaurant_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  restaurant_name VARCHAR(160) NOT NULL,
  address_line_1 VARCHAR(190) NOT NULL,
  address_line_2 VARCHAR(190) NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(190) NOT NULL,
  google_maps_url VARCHAR(1000) NULL,
  order_online_url VARCHAR(1000) NULL,
  logo_url VARCHAR(1000) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), CONSTRAINT chk_single_settings CHECK (id=1)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS business_hours (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  day_of_week TINYINT UNSIGNED NOT NULL,
  is_closed TINYINT(1) NOT NULL DEFAULT 0,
  open_time TIME NULL, close_time TIME NULL, note VARCHAR(255) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(id), UNIQUE KEY uq_business_hours_day(day_of_week)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  details_json JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id), KEY idx_audit_created(created_at), KEY idx_audit_user(user_id),
  CONSTRAINT fk_audit_user FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO menu_categories(name,slug,sort_order,is_active) VALUES
('Plates','plates',10,1),('Sandwiches','sandwiches',20,1),('Italian','italian',30,1),('Salads','salads',40,1),('Side Orders','side-orders',50,1),('Drinks','drinks',60,1),('Dessert','dessert',70,1)
ON DUPLICATE KEY UPDATE name=VALUES(name),sort_order=VALUES(sort_order),is_active=VALUES(is_active);

INSERT INTO restaurant_settings(id,restaurant_name,address_line_1,address_line_2,city,state,zip_code,phone,email,google_maps_url,order_online_url,logo_url)
VALUES(1,'Kebab Gyros','389 Murfreesboro Pike',NULL,'Nashville','TN','37210','(615) 333-3711','info@kebabgyronashville.com',NULL,NULL,NULL)
ON DUPLICATE KEY UPDATE id=id;

INSERT INTO business_hours(day_of_week,is_closed,open_time,close_time,note) VALUES
(0,0,'10:00','22:00',NULL),(1,0,'10:00','22:00',NULL),(2,0,'10:00','22:00',NULL),(3,0,'10:00','22:00',NULL),(4,0,'10:00','22:00',NULL),(5,0,'10:00','23:00',NULL),(6,0,'10:00','23:00',NULL)
ON DUPLICATE KEY UPDATE day_of_week=VALUES(day_of_week);
