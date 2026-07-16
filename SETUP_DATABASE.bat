@echo off
echo ====================================
echo Setup Database Ganesha Gym
echo ====================================
echo.

echo [1/3] Generating Prisma Client...
call npm run db:generate
if errorlevel 1 (
    echo ERROR: Generate failed!
    pause
    exit /b 1
)
echo.

echo [2/3] Pushing database schema (faster than migrate)...
call npm run db:push
if errorlevel 1 (
    echo ERROR: Database push failed!
    pause
    exit /b 1
)
echo.

echo [3/3] Seeding database (creating admin)...
call npm run db:seed
if errorlevel 1 (
    echo ERROR: Seed failed!
    pause
    exit /b 1
)
echo.

echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Admin created:
echo Email: admin@ganeshagym.com
echo Password: admin123_
echo.
pause

