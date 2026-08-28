$ErrorActionPreference = "Stop"

# ============================================================
#  Claude Code -> Anthropic (native / first-party API)
# ------------------------------------------------------------
#  Run Claude Code straight against api.anthropic.com.
#  Clears any OpenRouter routing left in the process so a
#  native run is never silently hijacked by claude-openrouter.ps1.
#
#  Auth resolution order:
#    1. ANTHROPIC_API_KEY already in the environment (User/Machine/Process)
#    2. ANTHROPIC_API_KEY=... in a root .env file next to this script
#    3. nothing -> fall back to Claude Code's own stored login
#       (your Claude subscription / `claude /login`)
#
#  Usage:  .\claude-anthropic.ps1 [any claude args]
#          .\claude-anthropic.ps1
#          .\claude-anthropic.ps1 --resume
# ============================================================

# ------------------------------------------------------------
# Optional: load ANTHROPIC_* from a root .env (if present)
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
        if ($name -like "ANTHROPIC_*") {
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# ------------------------------------------------------------
# Strip OpenRouter routing so this stays a native run
# ------------------------------------------------------------

Remove-Item Env:ANTHROPIC_BASE_URL   -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_MODEL      -ErrorAction SilentlyContinue
Remove-Item Env:ANTHROPIC_SMALL_FAST_MODEL -ErrorAction SilentlyContinue

# ------------------------------------------------------------
# Report configuration
# ------------------------------------------------------------

Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkGray
Write-Host " Claude Code -> Anthropic (native)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Base URL : (default) https://api.anthropic.com"
Write-Host "Model    : (Claude Code default)"

if (-not [string]::IsNullOrWhiteSpace($env:ANTHROPIC_API_KEY)) {
    $len = $env:ANTHROPIC_API_KEY.Length
    $shown = [Math]::Min(14, $len)
    Write-Host ("API key  : {0}... (from env/.env)" -f $env:ANTHROPIC_API_KEY.Substring(0, $shown))
} else {
    Write-Host "API key  : none set -> using Claude Code stored login (subscription)"
}
Write-Host ""

# ------------------------------------------------------------
# Launch Claude Code
# ------------------------------------------------------------

claude @args
