$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) { throw ".env not found. Copy .env.example to .env and add your keys." }

Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) { return }
  $name, $value = $line -split '=', 2
  Set-Item -Path "Env:$($name.Trim())" -Value $value.Trim().Trim('"')
}

$env:ANTHROPIC_API_KEY = ''

if (-not $env:ANTHROPIC_AUTH_TOKEN -or $env:ANTHROPIC_AUTH_TOKEN -eq 'sk-or-v1-replace-me') {
  throw "Set ANTHROPIC_AUTH_TOKEN in .env to your real OpenRouter key."
}

Write-Host "Routing Claude Code -> OpenRouter ($($env:ANTHROPIC_MODEL))" -ForegroundColor Cyan
claude @args
