$ErrorActionPreference = "Stop"

# Step 1: Test a small file upload to the backend directly
# First create a tiny test PDF-like file
$testFile = Join-Path $PSScriptRoot "test_upload.txt"
"Hello World - test upload" | Out-File -FilePath $testFile -Encoding utf8

# Step 2: Try uploading directly to Cloudinary raw endpoint to test the preset
$cloudName = "dtdb4irno"
$preset = "myvault_unsigned"

Write-Host "Testing Cloudinary upload directly..."
$form = @{
    file = Get-Item $testFile
    upload_preset = $preset
}

try {
    $response = Invoke-RestMethod -Uri "https://api.cloudinary.com/v1_1/$cloudName/raw/upload" -Method POST -Form $form
    Write-Host "SUCCESS! Cloudinary returned:"
    Write-Host ($response | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "FAILED! Error:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody"
    }
}

# Cleanup
Remove-Item $testFile -ErrorAction SilentlyContinue
