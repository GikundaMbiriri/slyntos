# PowerShell script to deploy Slyntos AI Firebase Functions

Write-Host "🚀 Deploying Slyntos AI Firebase Functions..." -ForegroundColor Green

# Check if Firebase CLI is installed
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    npm install -g firebase-tools
}

# Navigate to functions directory
Set-Location functions

Write-Host "📦 Installing Firebase Functions dependencies..." -ForegroundColor Blue
npm install

Write-Host "🔨 Building TypeScript..." -ForegroundColor Blue
npm run build

Write-Host "🔧 Testing functions locally (optional)..." -ForegroundColor Yellow
$testLocally = Read-Host "Test functions locally first? (y/n)"
if ($testLocally -eq "y" -or $testLocally -eq "Y") {
    Start-Process -FilePath "firebase" -ArgumentList "emulators:start", "--only", "functions" -NoNewWindow
    Start-Sleep 3
    Write-Host "🧪 Functions running locally at: http://localhost:5001" -ForegroundColor Green
    Write-Host "📋 Test callback URL: http://localhost:5001/YOUR-PROJECT-ID/us-central1/tumaCallback" -ForegroundColor Cyan
    Write-Host "Press any key to continue with deployment..." -ForegroundColor Yellow
    Read-Host
}

# Deploy to Firebase
Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Green
Set-Location ..
firebase deploy --only functions

Write-Host "✅ Firebase Functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Your callback URL is:" -ForegroundColor Cyan
$projectId = firebase use --current
Write-Host "https://us-central1-$projectId.cloudfunctions.net/tumaCallback" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Blue
Write-Host "1. Update the callback URL in src/services/unifiedPaymentService.ts" -ForegroundColor White  
Write-Host "2. Test M-Pesa payments with real transactions" -ForegroundColor White
Write-Host "3. Monitor function logs: firebase functions:log" -ForegroundColor White