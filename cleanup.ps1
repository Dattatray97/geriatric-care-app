# ============================================================
# ElderGuard Nexus - Cleanup Script
# Removes all unnecessary/duplicate files
# Run this ONCE, then delete this script too
# ============================================================

$PROJECT_DIR = $PSScriptRoot

Write-Host ""
Write-Host "  Cleaning up unnecessary files..." -ForegroundColor Yellow
Write-Host ""

# Delete old run scripts
$filesToDelete = @(
    "$PROJECT_DIR\run-backend.ps1",
    "$PROJECT_DIR\run-frontend.ps1",
    "$PROJECT_DIR\run.bat",
    "$PROJECT_DIR\docker-compose.yml"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        Write-Host "  [DELETED] $file" -ForegroundColor Red
    } else {
        Write-Host "  [SKIP] Already gone: $file" -ForegroundColor Gray
    }
}

# Delete entire duplicate frontend directory
$frontendDir = "$PROJECT_DIR\frontend"
if (Test-Path $frontendDir) {
    Remove-Item -Path $frontendDir -Recurse -Force
    Write-Host "  [DELETED] $frontendDir (entire duplicate frontend)" -ForegroundColor Red
} else {
    Write-Host "  [SKIP] Already gone: $frontendDir" -ForegroundColor Gray
}

# Delete empty IndexController.java (if it's the placeholder)
$indexController = "$PROJECT_DIR\geriatric-care-backend\geriatric-care-backend\src\main\java\com\geriatriccare\controller\IndexController.java"
if (Test-Path $indexController) {
    Remove-Item -Path $indexController -Force
    Write-Host "  [DELETED] IndexController.java (not needed)" -ForegroundColor Red
}

# Delete .idea directories (IDE-specific, not needed for running)
$ideaDirs = @(
    "$PROJECT_DIR\.idea",
    "$PROJECT_DIR\geriatric-care-backend\geriatric-care-backend\.idea"
)
foreach ($dir in $ideaDirs) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force
        Write-Host "  [DELETED] $dir" -ForegroundColor Red
    }
}

# Delete .vscode directory
$vscodeDir = "$PROJECT_DIR\.vscode"
if (Test-Path $vscodeDir) {
    Remove-Item -Path $vscodeDir -Recurse -Force
    Write-Host "  [DELETED] $vscodeDir" -ForegroundColor Red
}

# Delete .maven directory
$mavenDir = "$PROJECT_DIR\.maven"
if (Test-Path $mavenDir) {
    Remove-Item -Path $mavenDir -Recurse -Force
    Write-Host "  [DELETED] $mavenDir" -ForegroundColor Red
}

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "  Cleanup complete!" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Remaining project structure:" -ForegroundColor Cyan
Write-Host "    GApp/" -ForegroundColor White
Write-Host "      .tools/              (JDK 17 + Maven)" -ForegroundColor Gray
Write-Host "      geriatric-care-backend/" -ForegroundColor Gray
Write-Host "        geriatric-care-backend/" -ForegroundColor Gray
Write-Host "          src/main/java/   (Spring Boot backend)" -ForegroundColor Gray
Write-Host "          src/main/resources/" -ForegroundColor Gray
Write-Host "            static/        (Frontend HTML/CSS/JS)" -ForegroundColor Yellow
Write-Host "            application.yml" -ForegroundColor Gray
Write-Host "          pom.xml" -ForegroundColor Gray
Write-Host "      run.ps1              (Single run script)" -ForegroundColor Yellow
Write-Host "      setup-database.sql   (DB reference)" -ForegroundColor Gray
Write-Host ""
Write-Host "  To start the app: .\run.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "  You can now delete this cleanup script:" -ForegroundColor DarkGray
Write-Host "  Remove-Item '$PROJECT_DIR\cleanup.ps1'" -ForegroundColor DarkGray
Write-Host ""

Read-Host "  Press Enter to exit"
