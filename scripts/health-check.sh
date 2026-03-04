#!/bin/bash

# EduPass Production Health Check Script
# Run this script to verify all services are healthy

set -e

echo "================================================"
echo "  EduPass Production Health Check"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration (update these for your environment)
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost}"

# Function to check service health
check_service() {
    local name=$1
    local url=$2
    
    printf "Checking %-20s ... " "$name"
    
    if curl -sf "$url" > /dev/null; then
        printf "${GREEN}✓ OK${NC}\n"
        return 0
    else
        printf "${RED}✗ FAILED${NC}\n"
        return 1
    fi
}

# Function to check database
check_database() {
    printf "Checking %-20s ... " "PostgreSQL"
    
    if command -v psql &> /dev/null; then
        if PGPASSWORD=$DB_PASSWORD psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -d ${DB_NAME:-edupass} -c "SELECT 1" > /dev/null 2>&1; then
            printf "${GREEN}✓ OK${NC}\n"
            return 0
        else
            printf "${RED}✗ FAILED${NC}\n"
            return 1
        fi
    else
        printf "${YELLOW}⚠ SKIPPED (psql not found)${NC}\n"
        return 0
    fi
}

# Function to check Docker containers
check_docker() {
    if command -v docker &> /dev/null; then
        echo ""
        echo "Docker Container Status:"
        echo "------------------------"
        docker-compose ps
        echo ""
    fi
}

# Function to check disk space
check_disk_space() {
    printf "Checking %-20s ... " "Disk Space"
    
    if command -v df &> /dev/null; then
        available=$(df -h / | awk 'NR==2 {print $4}')
        usage=$(df -h / | awk 'NR==2 {print $5}')
        printf "${GREEN}✓ ${usage} used, ${available} free${NC}\n"
    else
        printf "${YELLOW}⚠ SKIPPED${NC}\n"
    fi
}

# Function to check process memory
check_memory() {
    printf "Checking %-20s ... " "Memory"
    
    if command -v free &> /dev/null; then
        memory=$(free -h | awk 'NR==2 {printf "%s used, %s free", $3, $4}')
        printf "${GREEN}✓ ${memory}${NC}\n"
    else
        printf "${YELLOW}⚠ SKIPPED${NC}\n"
    fi
}

# Function to check Stellar network connectivity
check_stellar() {
    printf "Checking %-20s ... " "Stellar Network"
    
    local stellar_url="https://horizon-testnet.stellar.org"
    if [ "$STELLAR_NETWORK" = "public" ]; then
        stellar_url="https://horizon.stellar.org"
    fi
    
    if curl -sf "${stellar_url}/" > /dev/null; then
        printf "${GREEN}✓ OK${NC}\n"
        return 0
    else
        printf "${RED}✗ FAILED${NC}\n"
        return 1
    fi
}

# Main health checks
echo "Service Health:"
echo "---------------"

failed=0

check_service "Backend API" "$BACKEND_URL/health" || ((failed++))
check_service "Frontend" "$FRONTEND_URL/health" || ((failed++))
check_database || ((failed++))
check_stellar || ((failed++))

echo ""
echo "System Resources:"
echo "-----------------"
check_disk_space
check_memory

check_docker

echo ""
echo "================================================"
if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ $failed check(s) failed!${NC}"
    exit 1
fi
