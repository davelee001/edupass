#!/bin/bash
# EduPass PostgreSQL Database Setup Script for Linux/Mac

echo "====================================="
echo "EduPass Database Setup"
echo "====================================="
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL is not installed or not in PATH!"
    echo "Please install PostgreSQL first."
    exit 1
fi

echo "PostgreSQL found!"
echo ""

# Prompt for database credentials
read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter database name (default: edupass): " DB_NAME
DB_NAME=${DB_NAME:-edupass}

echo ""
echo "Creating database '$DB_NAME'..."
echo ""

# Create the database
psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Database '$DB_NAME' created successfully!"
    echo ""
    echo "Running setup script..."
    psql -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/setup-database.sql"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Database setup completed successfully!"
        echo ""
    else
        echo ""
        echo "✗ Error running setup script"
        echo ""
    fi
else
    echo ""
    echo "ℹ Database might already exist or there was an error"
    echo "Trying to run setup script anyway..."
    psql -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/setup-database.sql"
fi

echo ""
echo "====================================="
echo "Next Steps:"
echo "====================================="
echo "1. Copy .env.example to .env in backend folder"
echo "2. Update database credentials in .env file"
echo "3. Run 'npm run dev' from backend folder"
echo ""
echo "The application will create tables automatically on first run."
echo "====================================="
