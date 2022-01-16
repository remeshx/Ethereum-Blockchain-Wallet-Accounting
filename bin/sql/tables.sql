DROP DATABASE IF EXISTS masterwallet;
CREATE DATABASE masterwallet;

use masterwallet;

CREATE TABLE `mw_addresses` (
  `id` int(11) NOT NULL,
  `token` enum('ETH','ERC20_USDT') NOT NULL,
  `address` varchar(50) NOT NULL,
  `private_key` tinytext NOT NULL,
  `created_at` datetime NOT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `user_email` VARCHAR(50) DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `mw_addresses` ADD PRIMARY KEY(`id`); 
ALTER TABLE `mw_addresses` CHANGE `id` `id` INT(11) NOT NULL AUTO_INCREMENT; 
ALTER TABLE `mw_addresses` ADD INDEX(`address`); 
ALTER TABLE `mw_addresses` ADD INDEX( `user_id`, `user_email`, `updated_at`);

CREATE TABLE `mw_balances` (
  `id` int(11) NOT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `token` enum('ETH','ERC20_USDT') NOT NULL,
  `address` varchar(50) NOT NULL,
  `balance` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `updated_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `mw_balances` ADD PRIMARY KEY(`id`); 
ALTER TABLE `mw_balances` CHANGE `id` `id` INT(11) NOT NULL AUTO_INCREMENT; 


CREATE TABLE `mw_balances_log` (
  `id` int(11) NOT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  `token` enum('ETH','ERC20_USDT') NOT NULL,
  `block_height`  INT(11) DEFAULT 0,
  `trx_hash`  varchar(100) NOT NULL,
  `address` varchar(50) NOT NULL,
  `deposit` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `withdraw` decimal(30,18) NOT NULL DEFAULT 0.000000000000000000,
  `created_at` datetime DEFAULT NULL,
  `notify`  tinyint(4) DEFAULT 0,
  `callid`  INT(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
ALTER TABLE `mw_balances_log` ADD PRIMARY KEY(`id`); 
ALTER TABLE `mw_balances_log` CHANGE `id` `id` INT(11) NOT NULL AUTO_INCREMENT; 



CREATE TABLE IF NOT EXISTS `mw_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `chain` enum('ETH','OTHERS') NOT NULL,
  `token_id` enum('ETH','ERC20_USDT','ERC20_XXX') NOT NULL,
  `token_address` varchar(50) NOT NULL,
  `active` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `chain` (`chain`),
  KEY `token_id` (`token_id`),
  KEY `active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


INSERT INTO `mw_tokens` (`id`, `chain`, `token_id`, `token_address`, `active`) VALUES (NULL, 'ETH', 'ETH', '', '1'), (NULL, 'ETH', 'ERC20_USDT', '0x583cbbb8a8443b38abcc0c956bece47340ea1367', '1');
ALTER TABLE `mw_tokens` ADD `connection_status` TINYINT NOT NULL DEFAULT '0' AFTER `active`; 

CREATE TABLE mw_settings (
    id SERIAL PRIMARY KEY,
    varCategory varChar(20),
    varName varChar(50),
    varValue varChar(50),
    varDefault boolean NOT NULL Default false,
    lastUpdate TIMESTAMP NOT NULL
);

INSERT INTO mw_settings (varCategory,varName,varValue,lastUpdate) VALUES 
        ('ETH','eth_block_read','0',CURRENT_TIMESTAMP );

