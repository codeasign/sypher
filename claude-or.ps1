$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Load .env
# ------------------------------------------------------------

$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    throw ".env not found.`nCopy .env.example to .env and configure your OpenRouter settings."
}

Get-Content $envFile | ForEach-Object {

    $line = $_.Trim()

    if (
        [string]::IsNullOrWhiteSpace($line) -or
        $line.StartsWith("#") -or
        -not $line.Contains("=")
    ) {
        return
    }

    $name, $value = $line -split "=", 2

    $name = $name.Trim()
    $value = $value.Trim().Trim('"').Trim("'")

    [System.Environment]::SetEnvironmentVariable(
        $name,
        $value,
        "Process"
    )
}

# ------------------------------------------------------------
# OpenRouter defaults
# ------------------------------------------------------------

if (-not $env:ANTHROPIC_BASE_URL) {
    $env:ANTHROPIC_BASE_URL = "https://openrouter.ai/api/v1"
}

if (-not $env:ANTHROPIC_MODEL) {
    $env:ANTHROPIC_MODEL = "anthropic/claude-sonnet-5"
}

# Never use Anthropic API Key when routing through OpenRouter
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue

# ------------------------------------------------------------
# Validation
# ------------------------------------------------------------

if ([string]::IsNullOrWhiteSpace($env:ANTHROPIC_AUTH_TOKEN)) {
    throw "ANTHROPIC_AUTH_TOKEN is missing from .env"
}

if ($env:ANTHROPIC_AUTH_TOKEN -notmatch "^sk-or-v1-") {
    throw "ANTHROPIC_AUTH_TOKEN is not a valid OpenRouter API key."
}

# ------------------------------------------------------------
# Display configuration
# ------------------------------------------------------------

Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkGray
Write-Host " Claude Code -> OpenRouter" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Base URL : $($env:ANTHROPIC_BASE_URL)"
Write-Host "Model    : $($env:ANTHROPIC_MODEL)"
Write-Host "Token    : $($env:ANTHROPIC_AUTH_TOKEN.Substring(0,18))..."
Write-Host ""

# ------------------------------------------------------------
# Launch Claude Code
# ------------------------------------------------------------

claude @args