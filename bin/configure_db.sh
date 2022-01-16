#!/bin/bash

echo "Configuring DATABASE btcdb"

export PASSWORD=""

C:/wamp64/bin/mariadb/mariadb10.4.10/bin/mysql mysql < C:/-PROJECTS/ETHNode/Production/Masterwallet/bin/sql/tables.sql -u root -P5606 --password=""

echo "btcdb configured"