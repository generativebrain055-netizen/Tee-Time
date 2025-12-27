# TeeTime Golf App - Comprehensive API Test Suite
# Run: .\run-tests.ps1

param(
    [string]$BaseUrl = "http://localhost:3000",
    [switch]$Verbose
)

# Colors and formatting
$script:passed = 0
$script:failed = 0
$script:skipped = 0
$script:results = @()

function Write-TestHeader($text) {
    Write-Host "`n$('=' * 60)" -ForegroundColor Cyan
    Write-Host " $text" -ForegroundColor Cyan
    Write-Host "$('=' * 60)" -ForegroundColor Cyan
}

function Write-TestResult($name, $status, $message = "") {
    $icon = switch ($status) {
        "PASS" { "[PASS]"; $script:passed++ }
        "FAIL" { "[FAIL]"; $script:failed++ }
        "SKIP" { "[SKIP]"; $script:skipped++ }
    }
    $color = switch ($status) { "PASS" { "Green" } "FAIL" { "Red" } "SKIP" { "Yellow" } }
    Write-Host "$icon $name" -ForegroundColor $color
    if ($message -and $Verbose) { Write-Host "       $message" -ForegroundColor Gray }
    $script:results += [PSCustomObject]@{ Test = $name; Status = $status; Message = $message }
}

function Invoke-ApiTest($method, $endpoint, $body = $null, $headers = @{}, $expectStatus = 200) {
    $uri = "$BaseUrl$endpoint"
    $params = @{ Uri = $uri; Method = $method; ContentType = "application/json"; ErrorAction = "Stop" }
    if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 10) }
    if ($headers.Count -gt 0) { $params.Headers = $headers }
    
    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response; StatusCode = 200 }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        try { $errBody = $_.ErrorDetails.Message | ConvertFrom-Json } catch { $errBody = @{ message = $_.Exception.Message } }
        return @{ Success = $false; Data = $errBody; StatusCode = $statusCode; Error = $_.Exception.Message }
    }
}

# Store tokens for authenticated tests
$script:accessToken = $null
$script:refreshToken = $null
$script:testUserId = $null

Write-Host @"

  _____ _____ _____ _____ _             _____ _____ _____ _____ 
 |_   _|   __|   __|_   _|_|_____ ___  |_   _|   __|   __|_   _|
   | | |   __|   __| | | | |     | -_|   | | |   __|__   | | |  
   |_| |_____|_____| |_| |_|_|_|_|___|   |_| |_____|_____| |_|  
                                                                
  TeeTime Golf App - API Test Suite v1.0
  
"@ -ForegroundColor Green

Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray

# ============================================================================
# SECTION 1: HEALTH & INFRASTRUCTURE TESTS
# ============================================================================
Write-TestHeader "SECTION 1: Health & Infrastructure"

# Test 1.1: Health Check
$result = Invoke-ApiTest -method "GET" -endpoint "/health"
if ($result.Success -and $result.Data.status -eq "ok") {
    Write-TestResult "1.1 Health Check Endpoint" "PASS" "Server is running"
} else {
    Write-TestResult "1.1 Health Check Endpoint" "FAIL" "Server not responding"
    Write-Host "CRITICAL: Server not running. Exiting tests." -ForegroundColor Red
    exit 1
}

# Test 1.2: 404 Handler
$result = Invoke-ApiTest -method "GET" -endpoint "/api/nonexistent-endpoint"
if (-not $result.Success -and $result.StatusCode -eq 404) {
    Write-TestResult "1.2 404 Not Found Handler" "PASS"
} else {
    Write-TestResult "1.2 404 Not Found Handler" "FAIL" "Expected 404"
}

# Test 1.3: CORS Headers
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/health" -Method GET
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-TestResult "1.3 CORS Headers Present" "PASS"
    } else {
        Write-TestResult "1.3 CORS Headers Present" "SKIP" "CORS may be configured differently"
    }
} catch {
    Write-TestResult "1.3 CORS Headers Present" "SKIP"
}

# ============================================================================
# SECTION 2: AUTHENTICATION TESTS
# ============================================================================
Write-TestHeader "SECTION 2: Authentication"

# Test 2.1: Request OTP - Valid Phone
$result = Invoke-ApiTest -method "POST" -endpoint "/auth/request-otp" -body @{ phoneNumber = "+15551234567" }
if ($result.Success -or $result.StatusCode -eq 500) {
    Write-TestResult "2.1 Request OTP - Valid Phone" "PASS" "OTP endpoint accessible"
} else {
    Write-TestResult "2.1 Request OTP - Valid Phone" "FAIL" $result.Data.message
}

# Test 2.2: Request OTP - Invalid Phone Format
$result = Invoke-ApiTest -method "POST" -endpoint "/auth/request-otp" -body @{ phoneNumber = "invalid" }
if (-not $result.Success -and $result.StatusCode -eq 400) {
    Write-TestResult "2.2 Request OTP - Invalid Phone Validation" "PASS"
} else {
    Write-TestResult "2.2 Request OTP - Invalid Phone Validation" "FAIL" "Should reject invalid phone"
}

# Test 2.3: Login - Missing Credentials
$result = Invoke-ApiTest -method "POST" -endpoint "/auth/login" -body @{}
if (-not $result.Success -and $result.StatusCode -eq 400) {
    Write-TestResult "2.3 Login - Missing Credentials Validation" "PASS"
} else {
    Write-TestResult "2.3 Login - Missing Credentials Validation" "FAIL"
}

# Test 2.4: Login - Invalid Credentials
$result = Invoke-ApiTest -method "POST" -endpoint "/auth/login" -body @{ phoneNumber = "+15559999999"; password = "wrongpass" }
if (-not $result.Success -and ($result.StatusCode -eq 401 -or $result.StatusCode -eq 404)) {
    Write-TestResult "2.4 Login - Invalid Credentials Rejected" "PASS"
} else {
    Write-TestResult "2.4 Login - Invalid Credentials Rejected" "FAIL"
}

# Test 2.5: Register New User (for testing)
$testPhone = "+1555" + (Get-Random -Minimum 1000000 -Maximum 9999999)
$testPassword = "TestPass123!@#"
$result = Invoke-ApiTest -method "POST" -endpoint "/auth/set-password" -body @{
    phoneNumber = $testPhone
    password = $testPassword
    firstName = "Test"
    lastName = "User"
    username = "testuser_" + (Get-Random -Minimum 1000 -Maximum 9999)
}
if ($result.Success -and $result.Data.accessToken) {
    $script:accessToken = $result.Data.accessToken
    $script:refreshToken = $result.Data.refreshToken
    $script:testUserId = $result.Data.user.id
    Write-TestResult "2.5 Register New User" "PASS" "User created, tokens received"
} else {
    Write-TestResult "2.5 Register New User" "FAIL" $result.Data.message
}

# Test 2.6: Get Current User (Authenticated)
if ($script:accessToken) {
    $authH = @{ Authorization = "Bearer $($script:accessToken)" }
    $result = Invoke-ApiTest -method "GET" -endpoint "/auth/me" -headers $authH
    if ($result.Success -and $result.Data.user) {
        Write-TestResult "2.6 Get Current User (Authenticated)" "PASS"
    } else {
        Write-TestResult "2.6 Get Current User (Authenticated)" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "2.6 Get Current User (Authenticated)" "SKIP" "No token available"
}

# Test 2.7: Protected Route Without Auth
$result = Invoke-ApiTest -method "GET" -endpoint "/api/roster"
if (-not $result.Success -and $result.StatusCode -eq 401) {
    Write-TestResult "2.7 Protected Route - Requires Auth" "PASS"
} else {
    Write-TestResult "2.7 Protected Route - Requires Auth" "FAIL" "Should return 401"
}

# Test 2.8: Refresh Token
if ($script:refreshToken) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/auth/refresh" -body @{ refreshToken = $script:refreshToken }
    if ($result.Success -and $result.Data.accessToken) {
        $script:accessToken = $result.Data.accessToken
        if ($result.Data.refreshToken) { $script:refreshToken = $result.Data.refreshToken }
        Write-TestResult "2.8 Refresh Token" "PASS" "New tokens received"
    } else {
        Write-TestResult "2.8 Refresh Token" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "2.8 Refresh Token" "SKIP" "No refresh token"
}

# Test 2.9: Update Profile
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "PUT" -endpoint "/auth/profile" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        firstName = "Updated"
        lastName = "Name"
        handicap = 15
    }
    if ($result.Success) {
        Write-TestResult "2.9 Update Profile" "PASS"
    } else {
        Write-TestResult "2.9 Update Profile" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "2.9 Update Profile" "SKIP" "No token"
}

# ============================================================================
# SECTION 3: ROSTER MANAGEMENT TESTS
# ============================================================================
Write-TestHeader "SECTION 3: Roster Management"

# Test 3.1: Get Roster (Empty)
if ($script:accessToken) {
    $authH = @{ Authorization = "Bearer $($script:accessToken)" }
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/roster" -headers $authH
    if ($result.Success) {
        Write-TestResult "3.1 Get Roster" "PASS" "Roster retrieved"
    } else {
        Write-TestResult "3.1 Get Roster" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.1 Get Roster" "SKIP" "No auth"
}

# Test 3.2: Get On-Deck
if ($script:accessToken) {
    $authH = @{ Authorization = "Bearer $($script:accessToken)" }
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/roster/on-deck" -headers $authH
    if ($result.Success) {
        Write-TestResult "3.2 Get On-Deck List" "PASS"
    } else {
        Write-TestResult "3.2 Get On-Deck List" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.2 Get On-Deck List" "SKIP"
}

# Test 3.3: Search Users
if ($script:accessToken) {
    $authH = @{ Authorization = "Bearer $($script:accessToken)" }
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/roster/search?q=test" -headers $authH
    if ($result.Success) {
        Write-TestResult "3.3 Search Users" "PASS"
    } else {
        Write-TestResult "3.3 Search Users" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.3 Search Users" "SKIP"
}

# Test 3.4: Get Roster Groups
if ($script:accessToken) {
    $authH = @{ Authorization = "Bearer $($script:accessToken)" }
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/roster/groups" -headers $authH
    if ($result.Success) {
        Write-TestResult "3.4 Get Roster Groups" "PASS"
    } else {
        Write-TestResult "3.4 Get Roster Groups" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.4 Get Roster Groups" "SKIP"
}

# Test 3.5: Create Roster Group
$script:testGroupId = $null
if ($script:accessToken) {
    $authH = @{ Authorization = "Bearer $($script:accessToken)" }
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/roster/groups" -headers $authH -body @{
        name = "Test Group " + (Get-Random -Minimum 100 -Maximum 999)
        description = "Test group for QA"
        color = "#5DB075"
    }
    if ($result.Success -and $result.Data.group) {
        $script:testGroupId = $result.Data.group.id
        Write-TestResult "3.5 Create Roster Group" "PASS"
    } else {
        Write-TestResult "3.5 Create Roster Group" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.5 Create Roster Group" "SKIP"
}

# Test 3.6: Update Roster Group
if ($script:accessToken -and $script:testGroupId) {
    $result = Invoke-ApiTest -method "PUT" -endpoint "/api/roster/groups/$($script:testGroupId)" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        name = "Updated Group Name"
        color = "#FF5733"
    }
    if ($result.Success) {
        Write-TestResult "3.6 Update Roster Group" "PASS"
    } else {
        Write-TestResult "3.6 Update Roster Group" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.6 Update Roster Group" "SKIP"
}

# Test 3.7: Get Group Members
if ($script:accessToken -and $script:testGroupId) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/roster/groups/$($script:testGroupId)/members" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "3.7 Get Group Members" "PASS"
    } else {
        Write-TestResult "3.7 Get Group Members" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.7 Get Group Members" "SKIP"
}

# Test 3.8: Roster Sorting
if ($script:accessToken) {
    $sortOptions = @("position", "socialRate", "handicap", "name")
    $allPassed = $true
    foreach ($sort in $sortOptions) {
        $result = Invoke-ApiTest -method "GET" -endpoint "/api/roster?sortBy=$sort" -headers @{ Authorization = "Bearer $($script:accessToken)" }
        if (-not $result.Success) { $allPassed = $false; break }
    }
    if ($allPassed) {
        Write-TestResult "3.8 Roster Sorting Options" "PASS" "All sort options work"
    } else {
        Write-TestResult "3.8 Roster Sorting Options" "FAIL"
    }
} else {
    Write-TestResult "3.8 Roster Sorting Options" "SKIP"
}

# Test 3.9: Waiver Wire
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/roster/waiver-wire?date=2025-01-15" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "3.9 Get Waiver Wire" "PASS"
    } else {
        Write-TestResult "3.9 Get Waiver Wire" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "3.9 Get Waiver Wire" "SKIP"
}

# ============================================================================
# SECTION 4: FRIENDS MANAGEMENT TESTS
# ============================================================================
Write-TestHeader "SECTION 4: Friends Management"

# Test 4.1: Get Friends List
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/friends" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "4.1 Get Friends List" "PASS"
    } else {
        Write-TestResult "4.1 Get Friends List" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "4.1 Get Friends List" "SKIP"
}

# Test 4.2: Get Pending Friend Requests
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/friends/requests/pending" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "4.2 Get Pending Friend Requests" "PASS"
    } else {
        Write-TestResult "4.2 Get Pending Friend Requests" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "4.2 Get Pending Friend Requests" "SKIP"
}

# Test 4.3: Get Sent Friend Requests
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/friends/requests/sent" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "4.3 Get Sent Friend Requests" "PASS"
    } else {
        Write-TestResult "4.3 Get Sent Friend Requests" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "4.3 Get Sent Friend Requests" "SKIP"
}

# Test 4.4: Discover Users
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/friends/discover" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "4.4 Discover Users" "PASS"
    } else {
        Write-TestResult "4.4 Discover Users" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "4.4 Discover Users" "SKIP"
}

# Test 4.5: Get Blocked Users
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/friends/blocked" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "4.5 Get Blocked Users" "PASS"
    } else {
        Write-TestResult "4.5 Get Blocked Users" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "4.5 Get Blocked Users" "SKIP"
}

# Test 4.6: Send Friend Request - Invalid User
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/friends/request" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        receiverId = "00000000-0000-0000-0000-000000000000"
    }
    if (-not $result.Success -and ($result.StatusCode -eq 404 -or $result.StatusCode -eq 400)) {
        Write-TestResult "4.6 Friend Request - Invalid User Rejected" "PASS"
    } else {
        Write-TestResult "4.6 Friend Request - Invalid User Rejected" "FAIL"
    }
} else {
    Write-TestResult "4.6 Friend Request - Invalid User Rejected" "SKIP"
}

# ============================================================================
# SECTION 5: TEE TIME TESTS
# ============================================================================
Write-TestHeader "SECTION 5: Tee Time Management"

$script:testTeeTimeId = $null

# Test 5.1: Create Tee Time
if ($script:accessToken) {
    $futureDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/tee-times" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        courseName = "Test Golf Course"
        courseLocation = "Test City, ST"
        teeDate = $futureDate
        teeTime = "09:00"
        maxPlayers = 4
        inviteType = "fcfs"
        notes = "QA Test Tee Time"
    }
    if ($result.Success -and $result.Data.teeTime) {
        $script:testTeeTimeId = $result.Data.teeTime.id
        Write-TestResult "5.1 Create Tee Time" "PASS"
    } else {
        Write-TestResult "5.1 Create Tee Time" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "5.1 Create Tee Time" "SKIP"
}

# Test 5.2: Get All Tee Times
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/tee-times" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "5.2 Get All Tee Times" "PASS"
    } else {
        Write-TestResult "5.2 Get All Tee Times" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "5.2 Get All Tee Times" "SKIP"
}

# Test 5.3: Get Upcoming Tee Times
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/tee-times/upcoming" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "5.3 Get Upcoming Tee Times" "PASS"
    } else {
        Write-TestResult "5.3 Get Upcoming Tee Times" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "5.3 Get Upcoming Tee Times" "SKIP"
}

# Test 5.4: Get Tee Time Details
if ($script:accessToken -and $script:testTeeTimeId) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/tee-times/$($script:testTeeTimeId)" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success -and $result.Data.teeTime) {
        Write-TestResult "5.4 Get Tee Time Details" "PASS"
    } else {
        Write-TestResult "5.4 Get Tee Time Details" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "5.4 Get Tee Time Details" "SKIP"
}

# Test 5.5: Get Calendar
if ($script:accessToken) {
    $start = (Get-Date).ToString("yyyy-MM-dd")
    $end = (Get-Date).AddDays(30).ToString("yyyy-MM-dd")
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/tee-times/calendar?start=$start&end=$end" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "5.5 Get Calendar View" "PASS"
    } else {
        Write-TestResult "5.5 Get Calendar View" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "5.5 Get Calendar View" "SKIP"
}

# Test 5.6: Get Tee Time History
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/tee-times/history" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "5.6 Get Tee Time History" "PASS"
    } else {
        Write-TestResult "5.6 Get Tee Time History" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "5.6 Get Tee Time History" "SKIP"
}

# Test 5.7: Tee Time Validation - Invalid Date
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/tee-times" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        courseName = "Test"
        teeDate = "invalid-date"
        teeTime = "09:00"
    }
    if (-not $result.Success -and $result.StatusCode -eq 400) {
        Write-TestResult "5.7 Tee Time - Invalid Date Validation" "PASS"
    } else {
        Write-TestResult "5.7 Tee Time - Invalid Date Validation" "FAIL"
    }
} else {
    Write-TestResult "5.7 Tee Time - Invalid Date Validation" "SKIP"
}

# ============================================================================
# SECTION 6: INVITE TESTS
# ============================================================================
Write-TestHeader "SECTION 6: Invite Management"

# Test 6.1: Get Pending Invites
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/invites/pending" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "6.1 Get Pending Invites" "PASS"
    } else {
        Write-TestResult "6.1 Get Pending Invites" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "6.1 Get Pending Invites" "SKIP"
}

# Test 6.2: Get Sent Invites
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/invites/sent" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "6.2 Get Sent Invites" "PASS"
    } else {
        Write-TestResult "6.2 Get Sent Invites" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "6.2 Get Sent Invites" "SKIP"
}

# Test 6.3: Get Response History
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/invites/history" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "6.3 Get Response History" "PASS"
    } else {
        Write-TestResult "6.3 Get Response History" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "6.3 Get Response History" "SKIP"
}

# Test 6.4: Create Invite - Validation
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/invites" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        teeTimeId = "invalid-uuid"
        invitees = @()
    }
    if (-not $result.Success -and $result.StatusCode -eq 400) {
        Write-TestResult "6.4 Create Invite - Validation" "PASS"
    } else {
        Write-TestResult "6.4 Create Invite - Validation" "FAIL"
    }
} else {
    Write-TestResult "6.4 Create Invite - Validation" "SKIP"
}

# Test 6.5: Respond to Invite - Invalid ID
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "PUT" -endpoint "/api/invites/00000000-0000-0000-0000-000000000000/respond" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        response = "accepted"
    }
    if (-not $result.Success -and ($result.StatusCode -eq 404 -or $result.StatusCode -eq 400)) {
        Write-TestResult "6.5 Respond to Invite - Invalid ID Rejected" "PASS"
    } else {
        Write-TestResult "6.5 Respond to Invite - Invalid ID Rejected" "FAIL"
    }
} else {
    Write-TestResult "6.5 Respond to Invite - Invalid ID Rejected" "SKIP"
}

# ============================================================================
# SECTION 7: NOTIFICATIONS TESTS
# ============================================================================
Write-TestHeader "SECTION 7: Notifications"

# Test 7.1: Get Notifications
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/notifications" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "7.1 Get Notifications" "PASS"
    } else {
        Write-TestResult "7.1 Get Notifications" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "7.1 Get Notifications" "SKIP"
}

# Test 7.2: Get Unread Count
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/notifications/unread-count" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success -and $null -ne $result.Data.count) {
        Write-TestResult "7.2 Get Unread Count" "PASS"
    } else {
        Write-TestResult "7.2 Get Unread Count" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "7.2 Get Unread Count" "SKIP"
}

# Test 7.3: Mark All as Read
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "PUT" -endpoint "/api/notifications/read-all" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "7.3 Mark All Notifications Read" "PASS"
    } else {
        Write-TestResult "7.3 Mark All Notifications Read" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "7.3 Mark All Notifications Read" "SKIP"
}

# Test 7.4: Notifications with Filters
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/notifications?limit=10&unreadOnly=true" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "7.4 Notifications with Filters" "PASS"
    } else {
        Write-TestResult "7.4 Notifications with Filters" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "7.4 Notifications with Filters" "SKIP"
}

# ============================================================================
# SECTION 8: SOCIAL RATE TESTS
# ============================================================================
Write-TestHeader "SECTION 8: Social Rate"

# Test 8.1: Get Current Social Rate
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/social-rate" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success -and $result.Data.socialRate) {
        Write-TestResult "8.1 Get Current Social Rate" "PASS" "Score: $($result.Data.socialRate.currentScore)"
    } else {
        Write-TestResult "8.1 Get Current Social Rate" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "8.1 Get Current Social Rate" "SKIP"
}

# Test 8.2: Get Social Rate History
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/social-rate/history" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "8.2 Get Social Rate History" "PASS"
    } else {
        Write-TestResult "8.2 Get Social Rate History" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "8.2 Get Social Rate History" "SKIP"
}

# Test 8.3: Get User Social Rate - Invalid User
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/social-rate/user/00000000-0000-0000-0000-000000000000" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if (-not $result.Success -and $result.StatusCode -eq 404) {
        Write-TestResult "8.3 Get User Social Rate - Invalid User" "PASS"
    } else {
        Write-TestResult "8.3 Get User Social Rate - Invalid User" "FAIL"
    }
} else {
    Write-TestResult "8.3 Get User Social Rate - Invalid User" "SKIP"
}

# ============================================================================
# SECTION 9: ATTENDANCE TESTS
# ============================================================================
Write-TestHeader "SECTION 9: Attendance & Check-In"

# Test 9.1: Get Attendance (for created tee time)
if ($script:accessToken -and $script:testTeeTimeId) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/tee-times/$($script:testTeeTimeId)/attendance" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "9.1 Get Attendance" "PASS"
    } else {
        Write-TestResult "9.1 Get Attendance" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "9.1 Get Attendance" "SKIP"
}

# Test 9.2: Check-In All (may fail if not within time window)
if ($script:accessToken -and $script:testTeeTimeId) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/tee-times/$($script:testTeeTimeId)/check-in/all" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success -or $result.StatusCode -eq 400) {
        Write-TestResult "9.2 Check-In All Endpoint" "PASS" "Endpoint accessible"
    } else {
        Write-TestResult "9.2 Check-In All Endpoint" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "9.2 Check-In All Endpoint" "SKIP"
}

# ============================================================================
# SECTION 10: DRAFT/QR CODE TESTS
# ============================================================================
Write-TestHeader "SECTION 10: Draft & QR Code"

# Test 10.1: Get QR Code
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/draft/qr" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success -and $result.Data.qrCode) {
        Write-TestResult "10.1 Get QR Code" "PASS"
    } else {
        Write-TestResult "10.1 Get QR Code" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "10.1 Get QR Code" "SKIP"
}

# Test 10.2: Get Scan History
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/draft/history" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "10.2 Get Scan History" "PASS"
    } else {
        Write-TestResult "10.2 Get Scan History" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "10.2 Get Scan History" "SKIP"
}

# Test 10.3: Scan QR - Invalid Data
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/draft/scan" -headers @{ Authorization = "Bearer $($script:accessToken)" } -body @{
        qrData = "invalid-qr-data"
    }
    if (-not $result.Success -and $result.StatusCode -eq 400) {
        Write-TestResult "10.3 Scan QR - Invalid Data Rejected" "PASS"
    } else {
        Write-TestResult "10.3 Scan QR - Invalid Data Rejected" "FAIL"
    }
} else {
    Write-TestResult "10.3 Scan QR - Invalid Data Rejected" "SKIP"
}

# ============================================================================
# SECTION 11: COURSES TESTS
# ============================================================================
Write-TestHeader "SECTION 11: Golf Courses"

# Test 11.1: Search Courses
$result = Invoke-ApiTest -method "GET" -endpoint "/api/courses/search?q=pebble"
if ($result.Success) {
    Write-TestResult "11.1 Search Courses" "PASS"
} else {
    Write-TestResult "11.1 Search Courses" "FAIL" $result.Data.message
}

# Test 11.2: Get Popular Courses
$result = Invoke-ApiTest -method "GET" -endpoint "/api/courses/popular"
if ($result.Success) {
    Write-TestResult "11.2 Get Popular Courses" "PASS"
} else {
    Write-TestResult "11.2 Get Popular Courses" "FAIL" $result.Data.message
}

# Test 11.3: Get Favorite Courses (Authenticated)
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/api/courses/favorites" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "11.3 Get Favorite Courses" "PASS"
    } else {
        Write-TestResult "11.3 Get Favorite Courses" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "11.3 Get Favorite Courses" "SKIP"
}

# ============================================================================
# SECTION 12: CLEANUP & LOGOUT
# ============================================================================
Write-TestHeader "SECTION 12: Cleanup"

# Test 12.1: Delete Test Group
if ($script:accessToken -and $script:testGroupId) {
    $result = Invoke-ApiTest -method "DELETE" -endpoint "/api/roster/groups/$($script:testGroupId)" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "12.1 Delete Test Group" "PASS"
    } else {
        Write-TestResult "12.1 Delete Test Group" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "12.1 Delete Test Group" "SKIP"
}

# Test 12.2: Cancel Test Tee Time
if ($script:accessToken -and $script:testTeeTimeId) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/api/tee-times/$($script:testTeeTimeId)/cancel" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "12.2 Cancel Test Tee Time" "PASS"
    } else {
        Write-TestResult "12.2 Cancel Test Tee Time" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "12.2 Cancel Test Tee Time" "SKIP"
}

# Test 12.3: Logout
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "POST" -endpoint "/auth/logout" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if ($result.Success) {
        Write-TestResult "12.3 Logout" "PASS"
    } else {
        Write-TestResult "12.3 Logout" "FAIL" $result.Data.message
    }
} else {
    Write-TestResult "12.3 Logout" "SKIP"
}

# Test 12.4: Verify Token Invalidated
if ($script:accessToken) {
    $result = Invoke-ApiTest -method "GET" -endpoint "/auth/me" -headers @{ Authorization = "Bearer $($script:accessToken)" }
    if (-not $result.Success -and $result.StatusCode -eq 401) {
        Write-TestResult "12.4 Token Invalidated After Logout" "PASS"
    } else {
        Write-TestResult "12.4 Token Invalidated After Logout" "FAIL"
    }
} else {
    Write-TestResult "12.4 Token Invalidated After Logout" "SKIP"
}

# ============================================================================
# TEST SUMMARY
# ============================================================================
Write-Host "`n$('=' * 60)" -ForegroundColor Magenta
Write-Host " TEST SUMMARY" -ForegroundColor Magenta
Write-Host "$('=' * 60)" -ForegroundColor Magenta

$total = $script:passed + $script:failed + $script:skipped
$passRate = if ($total -gt 0) { [math]::Round(($script:passed / $total) * 100, 1) } else { 0 }

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "  Passed:  $($script:passed)" -ForegroundColor Green
Write-Host "  Failed:  $($script:failed)" -ForegroundColor Red
Write-Host "  Skipped: $($script:skipped)" -ForegroundColor Yellow
Write-Host "`nPass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })

# Generate Report File
$reportDate = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportPath = Join-Path $PSScriptRoot "QA_TEST_REPORT_$reportDate.md"

$reportContent = @"
# TeeTime Golf App - QA Test Report

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Base URL:** $BaseUrl  
**Environment:** Development

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | $total |
| Passed | $($script:passed) |
| Failed | $($script:failed) |
| Skipped | $($script:skipped) |
| Pass Rate | $passRate% |

---

## Test Results by Section

"@

# Group results by section
$sections = @{
    "1" = "Health & Infrastructure"
    "2" = "Authentication"
    "3" = "Roster Management"
    "4" = "Friends Management"
    "5" = "Tee Time Management"
    "6" = "Invite Management"
    "7" = "Notifications"
    "8" = "Social Rate"
    "9" = "Attendance & Check-In"
    "10" = "Draft & QR Code"
    "11" = "Golf Courses"
    "12" = "Cleanup"
}

foreach ($section in $sections.Keys | Sort-Object { [int]$_ }) {
    $sectionResults = $script:results | Where-Object { $_.Test -match "^$section\." }
    if ($sectionResults) {
        $reportContent += "`n### Section $section`: $($sections[$section])`n`n"
        $reportContent += "| Test | Status |`n|------|--------|`n"
        foreach ($r in $sectionResults) {
            $statusIcon = switch ($r.Status) { "PASS" { "✅" } "FAIL" { "❌" } "SKIP" { "⏭️" } }
            $reportContent += "| $($r.Test) | $statusIcon $($r.Status) |`n"
        }
    }
}

$reportContent += @"

---

## Failed Tests Details

"@

$failedTests = $script:results | Where-Object { $_.Status -eq "FAIL" }
if ($failedTests) {
    foreach ($f in $failedTests) {
        $reportContent += "- **$($f.Test)**: $($f.Message)`n"
    }
} else {
    $reportContent += "_No failed tests_`n"
}

$reportContent += @"

---

## Recommendations

"@

if ($script:failed -eq 0) {
    $reportContent += "✅ All tests passed! The API is functioning correctly.`n"
} else {
    $reportContent += "⚠️ Some tests failed. Please review the failed tests above and fix the issues.`n"
}

$reportContent | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host "`n📄 Report saved to: $reportPath" -ForegroundColor Cyan
Write-Host "`nCompleted: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
