$files = @(
    "D:\jenny\sypher\docs\system-design-fundamentals\choosing-the-right-database\06-interview.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\choosing-the-right-database\07-challenge.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\graph-databases\06-interview.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\graph-databases\07-challenge.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\object-storage\06-interview.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\object-storage\07-challenge.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\relational-databases\06-interview.mdx"
)
$count = 0
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    $original = $content
    # Remove all 3+ byte UTF-8 sequences that are corrupted
    # Keep only ASCII (0-127) plus standard markdown/HTML characters
    $sb = New-Object System.Text.StringBuilder
    $i = 0
    while ($i -lt $content.Length) {
        $c = $content[$i]
        $code = [int]$c
        if ($code -le 127) {
            $null = $sb.Append($c)
        } elseif ($code -eq 0x2013 -or $code -eq 0x2014) {
            $null = $sb.Append("--")  # en/em dash
        } elseif ($code -eq 0x2018 -or $code -eq 0x2019) {
            $null = $sb.Append("'")   # single quotes
        } elseif ($code -eq 0x201C -or $code -eq 0x201D) {
            $null = $sb.Append('"')   # double quotes
        } elseif ($code -eq 0x2026) {
            $null = $sb.Append("...") # ellipsis
        } elseif ($code -eq 0x00A0) {
            $null = $sb.Append(" ")   # non-breaking space
        } elseif ($code -eq 0x00B1) {
            $null = $sb.Append("+/-") # plus-minus
        } elseif ($code -eq 0x00D7) {
            $null = $sb.Append("x")   # multiplication
        } elseif ($code -ge 0x2500 -and $code -le 0x257F) {
            $null = $sb.Append($c)   # box drawing - keep
        } elseif ($code -ge 0x2580 -and $code -le 0x259F) {
            $null = $sb.Append($c)   # block elements - keep
        }
        # else: skip corrupted character
        $i++
    }
    $cleaned = $sb.ToString()
    if ($cleaned -ne $original) {
        [System.IO.File]::WriteAllText($f, $cleaned, [System.Text.Encoding]::UTF8)
        $count++
    }
}
Write-Host "Fixed $count files"
