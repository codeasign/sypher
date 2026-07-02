$corruptedFiles = @(
    # how-the-internet-works (4 remaining, 04-tradeoffs already fixed)
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\01-concepts.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\02-deep-dive.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\03-architecture.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\how-the-internet-works\05-real-world.mdx"
    # http2-and-http3
    "D:\jenny\sypher\docs\system-design-fundamentals\http2-and-http3\01-concepts.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\http2-and-http3\02-deep-dive.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\http2-and-http3\03-architecture.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\http2-and-http3\04-tradeoffs.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\http2-and-http3\05-real-world.mdx"
    # grpc
    "D:\jenny\sypher\docs\system-design-fundamentals\grpc\02-deep-dive.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\grpc\03-architecture.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\grpc\04-tradeoffs.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\grpc\05-real-world.mdx"
    # Others
    "D:\jenny\sypher\docs\system-design-fundamentals\consistency\01-concepts.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\choosing-the-right-database\06-interview.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\choosing-the-right-database\07-challenge.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\graph-databases\06-interview.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\graph-databases\07-challenge.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\object-storage\06-interview.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\object-storage\07-challenge.mdx"
    "D:\jenny\sypher\docs\system-design-fundamentals\relational-databases\06-interview.mdx"
)

function Fix-SingleEncoding {
    param([string]$content)
    try {
        $latin1 = [System.Text.Encoding]::GetEncoding('ISO-8859-1')
        $bytes = $latin1.GetBytes($content)
        return [System.Text.Encoding]::UTF8.GetString($bytes)
    } catch {
        return $content
    }
}

$total = $corruptedFiles.Count
$fixed = 0

foreach ($file in $corruptedFiles) {
    Write-Host "[$fixed/$total] Processing: $file"
    try {
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        $result = Fix-SingleEncoding $content
        [System.IO.File]::WriteAllText($file, $result, [System.Text.Encoding]::UTF8)
        $fixed++
        Write-Host "  OK"
    } catch {
        Write-Host "  ERROR: $_"
    }
}

Write-Host "Done: $fixed/$total files processed"