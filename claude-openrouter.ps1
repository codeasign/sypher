$ErrorActionPreference = "Stop"

# ============================================================
#  Claude Code -> OpenRouter
# ------------------------------------------------------------
#  Route Claude Code through OpenRouter's Anthropic-compatible
#  endpoint instead of api.anthropic.com.
#
#  Token resolution order:
#    1. ANTHROPIC_AUTH_TOKEN already in the environment
#    2. OPENROUTER_API_KEY in the environment  (you have this at User scope)
#    3. ANTHROPIC_AUTH_TOKEN=... or OPENROUTER_API_KEY=... in a root .env
#
#  Overridable via env or root .env:
#    ANTHROPIC_MODEL             (default: anthropic/claude-sonnet-5)
#    ANTHROPIC_SMALL_FAST_MODEL  (default: anthropic/claude-haiku-4.5)
#    ANTHROPIC_BASE_URL          (default: https://openrouter.ai/api/v1)
#
#  Usage:  .\claude-openrouter.ps1 [any claude args]
#          .\claude-openrouter.ps1
#          .\claude-openrouter.ps1 --resume
# ============================================================

# ------------------------------------------------------------
# Optional: load overrides from a root .env (if present)
# ------------------------------------------------------------

$envFile = Join-Path $PSScriptRoot ".env"

if (Test-Path $envFile) {
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
        if ($name -like "ANTHROPIC_*" -or $name -eq "OPENROUTER_API_KEY") {
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# ------------------------------------------------------------
# Resolve the OpenRouter token
# ------------------------------------------------------------

if ([string]::IsNullOrWhiteSpace($env:ANTHROPIC_AUTH_TOKEN)) {
    if (-not [string]::IsNullOrWhiteSpace($env:OPENROUTER_API_KEY)) {
        $env:ANTHROPIC_AUTH_TOKEN = $env:OPENROUTER_API_KEY
    }
}

if ([string]::IsNullOrWhiteSpace($env:ANTHROPIC_AUTH_TOKEN)) {
    throw "No OpenRouter key found. Set OPENROUTER_API_KEY (or ANTHROPIC_AUTH_TOKEN), or add one to $envFile"
}

if ($env:ANTHROPIC_AUTH_TOKEN -notmatch "^sk-or-v1-") {
    throw "ANTHROPIC_AUTH_TOKEN does not look like an OpenRouter key (expected sk-or-v1- prefix)."
}

# ------------------------------------------------------------
# OpenRouter routing config
# ------------------------------------------------------------

if ([string]::IsNullOrWhiteSpace($env:ANTHROPIC_BASE_URL)) {
    $env:ANTHROPIC_BASE_URL = "https://openrouter.ai/api/v1"
}

if ([string]::IsNullOrWhiteSpace($env:ANTHROPIC_MODEL)) {
    $env:ANTHROPIC_MODEL = "anthropic/claude-sonnet-5"
}

if ([string]::IsNullOrWhiteSpace($env:ANTHROPIC_SMALL_FAST_MODEL)) {
    $env:ANTHROPIC_SMALL_FAST_MODEL = "anthropic/claude-haiku-4.5"
}

# A first-party key must never ride along when routing through OpenRouter
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue

# ------------------------------------------------------------
# Report configuration
# ------------------------------------------------------------

Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkGray
Write-Host " Claude Code -> OpenRouter" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Base URL   : $($env:ANTHROPIC_BASE_URL)"
Write-Host "Model      : $($env:ANTHROPIC_MODEL)"
Write-Host "Small model: $($env:ANTHROPIC_SMALL_FAST_MODEL)"
Write-Host "Token      : $($env:ANTHROPIC_AUTH_TOKEN.Substring(0,18))..."
Write-Host ""

# ------------------------------------------------------------
# Launch Claude Code
# ------------------------------------------------------------

claude @args
