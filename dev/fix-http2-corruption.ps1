# Fix HTTP/2 and HTTP/3 corruption patterns
# Run from repo root: .\dev\fix-http2-corruption.ps1

$files = @(
    "docs\system-design-fundamentals\http2-and-http3\02-deep-dive.mdx",
    "docs\system-design-fundamentals\http2-and-http3\03-architecture.mdx",
    "docs\system-design-fundamentals\http2-and-http3\05-real-world.mdx"
)

$baseDir = "D:\jenny\sypher"

foreach ($relPath in $files) {
    $fullPath = Join-Path $baseDir $relPath
    Write-Host "Processing $relPath..." -ForegroundColor Cyan

    $content = Get-Content -Path $fullPath -Raw -Encoding UTF8
    $lines = $content -split "`r`n|`n"
    $inCodeBlock = $false
    $inAsciiContent = $false
    $newLines = @()
    $fixedCount = 0

    foreach ($line in $lines) {
        $original = $line

        # Track code block boundaries
        if ($line -match '^\s*```') {
            $inCodeBlock = -not $inCodeBlock
        }

        # Track AsciiDiagram content boundaries
        if ($line -match 'content=`{`') {
            $inAsciiContent = $true
        }
        if ($line -match '^\s*`' -and $inAsciiContent) {
            $inAsciiContent = $false
        }

        # Only fix inside code blocks or AsciiDiagram content
        if ($inCodeBlock -or $inAsciiContent) {
            # Order matters: longer patterns first to avoid partial matches

            # Long horizontal runs (repeating --?,--?,--? pattern)
            # Use a while loop to handle variable-length runs
            while ($line -match '--\?,-{0,2}\?,-{0,2}\?') {
                $line = $line -replace '--\?,-{0,2}\?,-{0,2}\?--\?', '───'
                $line = $line -replace '--\?,-{0,2}\?', '───'
            }

            # --??--?o → ──┘ (end corner)
            $line = $line -replace '--\?\?--\?o', '───┘'

            # --??--? → ──▶ (long arrow)
            $line = $line -replace '--\?\?--\?', '───▶'

            # --??s → │ (vertical line marker)
            $line = $line -replace '--\?\?s', ' │ '

            # --??T → ──▶ (arrow)
            $line = $line -replace '--\?\?T', '──▶ '

            # --?"¶ → ─────▶ (arrow at end)
            $line = $line -replace '--\?"¶', '─────▶'

            # --?"¼ → │ (vertical down)
            $line = $line -replace '--\?"¼', '│'

            # --?"² → │ (vertical marker)
            $line = $line -replace '--\?"²', '│'

            # --?"--?¤ → └──┘ (box corner)
            $line = $line -replace '--\?"--\?¤', '└──┘'

            # --?"--? → └── (corner)
            $line = $line -replace '--\?"--\?', '└───'

            # --?'--?´ → ├──┤ (T-junction)
            $line = $line -replace "--\?'--\?´", '├──┤'

            # --?' → ├─ (T-junction from left)
            $line = $line -replace "--\?'", '├─'

            # --?" → └─ (corner, remaining)
            $line = $line -replace '--\?"', '└─'

            # --??o → ──┘ (end)
            $line = $line -replace '--\?\?o', '───┘'

            # --?o → ─┘ (short end)
            $line = $line -replace '--\?o', '───┘'

            # --?¤ → ─┘ (alt end)
            $line = $line -replace '--\?¤', '───┘'

            # --??? → ─── (long horizontal)
            $line = $line -replace '--\?\?\?', '────'
            $line = $line -replace '--\?\?', '───'

            # --? → ─ (single segment, only when followed by space or end)
            $line = $line -replace '--\?(?=\s|$)', '───'

            # Fix remaining --? that are followed by word chars (arrows)
            $line = $line -replace '--\?(?=\w)', '──▶ '

            # Clean up: "?" between box-drawing chars
            $line = $line -replace '([─│└├┘┤┬┴┼▶◀])\?([─│└├┘┤┬┴┼▶◀])', '$1─$2'
            $line = $line -replace '([─│└├┘┤┬┴┼▶◀])\? ', '$1─ '
            $line = $line -replace ' \?([─│└├┘┤┬┴┼▶◀])', ' ─$1'

            # Clean up: --,--?o → ──┘
            $line = $line -replace '--,o', '───┘'
            $line = $line -replace '--,--', '────'
            $line = $line -replace '--,"', '───┘'

            # Clean up: --" (stray quote marks)
            $line = $line -replace '--"', '───'

            # Clean up any remaining ? between non-word chars
            $line = $line -replace '([^a-zA-Z0-9])\?([^a-zA-Z0-9])', '$1─$2'
        }

        if ($line -ne $original) { $fixedCount++ }
        $newLines += $line
    }

    $newContent = $newLines -join "`r`n"
    [System.IO.File]::WriteAllText($fullPath, $newContent, [System.Text.UTF8Encoding]::new($false))

    Write-Host "  Fixed $fixedCount lines" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Done! Manually verify remaining corruption in each file." -ForegroundColor Yellow