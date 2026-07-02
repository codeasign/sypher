$files = @(
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\01-concepts.mdx",
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\02-deep-dive.mdx",
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\03-architecture.mdx",
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\04-tradeoffs.mdx",
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\05-real-world.mdx"
)

function Fix-Encoding {
    param([string]$content)
    # Known mojibake sequences and their replacements
    # The corrupted text uses sequences like:
    # 0xC3 0x83 0xC6 0x92 0xC2 0xA2 ... which is UTF-8 of the Latin-1 rendering of original UTF-8 bytes

    # Try reverse double-encoding first
    try {
        $latin1 = [System.Text.Encoding]::GetEncoding('ISO-8859-1')
        $bytes = $latin1.GetBytes($content)
        $fixed = [System.Text.Encoding]::UTF8.GetString($bytes)
        return $fixed
    } catch {
        return $content
    }
}

foreach ($file in $files) {
    Write-Host "Processing: $file"
    $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
    $fixed = Fix-Encoding $content
    [System.IO.File]::WriteAllText($file, $fixed, [System.Text.Encoding]::UTF8)
    Write-Host "  Done"
}