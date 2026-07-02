$files = Get-ChildItem -Path "D:\jenny\sypher\docs\system-design-fundamentals" -Recurse -Include "*.mdx" | Where-Object { $_.FullName -notlike "*04-tradeoffs*" }
$count = 0
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    # Remove control characters (keep tabs and newlines)
    $content = [regex]::Replace($content, '[\x00-\x08\x0B\x0C\x0E-\x1F]', '')

    # Replace specific corrupted byte sequences via byte-level raw processing
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
    $newBytes = New-Object System.Collections.ArrayList

    $i = 0
    while ($i -lt $bytes.Length) {
        # Look for 3-byte sequences that are corrupted characters
        if ($i + 2 -lt $bytes.Length) {
            $seq = ($bytes[$i].ToString("X2")) + " " + ($bytes[$i+1].ToString("X2")) + " " + ($bytes[$i+2].ToString("X2"))

            # These are common corrupted UTF-8 sequences for em dashes, quotes, etc.
            # Replace them with simple ASCII alternatives
            if ($seq -eq "C3 A2 82" -or $seq -eq "C3 A2 80") {
                $newBytes.AddRange([byte[]]@(0x2D, 0x2D))  # "--"
                $i += 3
                continue
            }
            if ($seq -eq "C3 82 AC" -or $seq -eq "C2 82 AC") {
                # skip
                $i += 3
                continue
            }
            if ($seq -eq "E2 82 AC") {
                $newBytes.AddRange([byte[]]@(0x2D, 0x2D))  # "--"
                $i += 3
                continue
            }
            if ($seq -eq "EF BF BD") {
                # replacement character, skip
                $i += 3
                continue
            }
        }
        if ($i + 1 -lt $bytes.Length) {
            $seq2 = ($bytes[$i].ToString("X2")) + " " + ($bytes[$i+1].ToString("X2"))
            if ($seq2 -eq "C2 82" -or $seq2 -eq "C2 A2") {
                $i += 2
                continue
            }
            if ($seq2 -eq "C3 82") {
                $i += 2
                continue
            }
        }
        $newBytes.Add($bytes[$i]) | Out-Null
        $i++
    }

    $cleaned = [System.Text.Encoding]::UTF8.GetString($newBytes.ToArray())

    if ($cleaned -ne $original) {
        [System.IO.File]::WriteAllText($f.FullName, $cleaned, [System.Text.Encoding]::UTF8)
        $count++
    }
}
Write-Host "Fixed $count files"