# ============================================================
# ElderGuard Nexus - Single Command Runner
# Starts Spring Boot (Embedded Tomcat) serving BOTH
# Backend API + Frontend UI on http://localhost:8088
# ============================================================

$MAVEN_VERSION = "3.9.6"
$PROJECT_DIR = $PSScriptRoot
$BACKEND_DIR = "$PROJECT_DIR\geriatric-care-backend\geriatric-care-backend"
$TOOLS_DIR = "$PROJECT_DIR\.tools"
$MVN_CMD = "$TOOLS_DIR\apache-maven-$MAVEN_VERSION\bin\mvn.cmd"
$JDK_DIR = "$TOOLS_DIR\jdk-17.0.10+7"

Clear-Host
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "       ElderGuard Nexus - Geriatric Care Application" -ForegroundColor Cyan
Write-Host "       Embedded Tomcat (Backend API + Frontend UI)" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verify JDK ──
if (-Not (Test-Path "$JDK_DIR\bin\java.exe")) {
    Write-Host "  [ERROR] JDK 17 not found at: $JDK_DIR" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host "  [OK] JDK 17 found" -ForegroundColor Green

# ── 2. Verify Maven ──
if (-Not (Test-Path $MVN_CMD)) {
    Write-Host "  [ERROR] Maven not found at: $MVN_CMD" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host "  [OK] Maven $MAVEN_VERSION found" -ForegroundColor Green

# ── 3. Set JAVA_HOME ──
$env:JAVA_HOME = $JDK_DIR
$env:Path = "$JDK_DIR\bin;" + $env:Path
Write-Host "  [OK] JAVA_HOME set" -ForegroundColor Green

# ── 4. Show Java version ──
Write-Host ""
Write-Host "  Java version:" -ForegroundColor Yellow
$javaVersionOutput = & "$JDK_DIR\bin\java.exe" -version 2>&1
foreach ($line in $javaVersionOutput) {
    Write-Host "    $line" -ForegroundColor Gray
}

# ── 5. Navigate to backend ──
Set-Location $BACKEND_DIR

# ── 6. Display URLs ──
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "  Starting ElderGuard Nexus on port 8088..." -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  FRONTEND (served by embedded Tomcat):" -ForegroundColor Magenta
Write-Host "    Role Selection : http://localhost:8088/index.html" -ForegroundColor Yellow
Write-Host "    Caretaker Login: http://localhost:8088/login-caretaker.html" -ForegroundColor Yellow
Write-Host "    Doctor Login   : http://localhost:8088/login-doctor.html" -ForegroundColor Yellow
Write-Host "    Family Login   : http://localhost:8088/login-family.html" -ForegroundColor Yellow
Write-Host "    Dashboard      : http://localhost:8088/dashboard.html" -ForegroundColor Yellow
Write-Host ""
Write-Host "  BACKEND API:" -ForegroundColor Magenta
Write-Host "    Health Check   : http://localhost:8088/api/v1/health" -ForegroundColor Yellow
Write-Host "    Swagger UI     : http://localhost:8088/swagger-ui/index.html" -ForegroundColor Yellow
Write-Host "    WebSocket      : ws://localhost:8088/ws" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Press Ctrl+C to stop the server" -ForegroundColor DarkGray
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""

# ── 7. Open browser after 15 seconds ──
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 15
    Start-Process "http://localhost:8088/index.html"
} | Out-Null

# ── 8. Build and Run (Embedded Tomcat serves both API + Frontend) ──
& $MVN_CMD clean spring-boot:run "-Dspring-boot.run.jvmArguments=-Dfile.encoding=UTF-8"
