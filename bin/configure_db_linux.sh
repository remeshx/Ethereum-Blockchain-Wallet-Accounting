#!/bin/bash

echo "Configuring DATABASE btcdb"

export PASSWORD="root"

mysql < ./bin/sql/tables.sql -u root -P3306 -p

echo "btcdb configured"
