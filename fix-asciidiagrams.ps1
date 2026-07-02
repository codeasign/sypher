# PowerShell script to fix broken AsciiDiagram patterns in .mdx files
# Uses text-based replacement (no regex escaping issues)

$baseDir = "D:\jenny\sypher\docs\system-design-fundamentals"

# Get all .mdx files
$files = Get-ChildItem -Path $baseDir -Recurse -Filter "*.mdx"

$totalFixed = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $original = $content
    $fixed = $false

    # FIX 1: `}</AsciiDiagram> -> `} />
    # This handles cases where content={`...`}</AsciiDiagram> should be content={`...`} />
    if ($content.Contains('`}</AsciiDiagram>')) {
        $content = $content.Replace('`}</AsciiDiagram>', '`} />')
        Write-Host "  FIX 1: `'}></AsciiDiagram> -> `'} /> in $($file.Name)"
        $fixed = $true
    }

    # FIX 2: Remove <AsciiDiagram ...>\n{` ... `}\n/> pattern or similar
    # Convert opened tags to self-closing with content prop
    # We handle this by replacing the text patterns

    # FIX 2a: Remove standalone </AsciiDiagram> lines after lines containing `} />
    if ($content.Contains('</AsciiDiagram>')) {
        $content = $content -replace '(?s)(`\s*\}\s*/\s*>\s*)\s*</AsciiDiagram>', '$1'
        Write-Host "  FIX 2a: Removed </AsciiDiagram> after } /> in $($file.Name)"
        $fixed = $true
    }

    # FIX 2b: Remove </AsciiDiagram> after just `} (no />)
    if ($content.Contains('</AsciiDiagram>')) {
        $content = $content -replace '(?s)(`\s*\}\s*)\s*</AsciiDiagram>', '$1 />'
        Write-Host "  FIX 2b: Replaced </AsciiDiagram> after } with } /> in $($file.Name)"
        $fixed = $true
    }

    # FIX 3: Fix `}&gt; to `} />
    if ($content.Contains('`}&gt;')) {
        $content = $content.Replace('`}&gt;', '`} />')
        Write-Host "  FIX 3: `'}>&gt; -> `'} /> in $($file.Name)"
        $fixed = $true
    }

    # FIX 4: Fix `}> to `} />
    if ($content.Contains('`}>')) {
        $content = $content.Replace('`}>', '`} />')
        Write-Host "  FIX 4: `'} > -> `'} /> in $($file.Name)"
        $fixed = $true
    }

    # FIX 5: Fix double backtick in content prop: content={`\n{` -> content={`\n
    if ($content.Contains("content={``r`n{`") -or $content.Contains("content={``n{`")) {
        $content = $content.Replace("content={``r`n{`", "content={`").Replace("content={``n{`", "content={`")
        Write-Host "  FIX 5: Fixed double backtick in $($file.Name)"
        $fixed = $true
    }

    # FIX 6: Convert opened-tag AsciiDiagram with {` to content prop
    # Pattern: <AsciiDiagram ...>\n{` ... `}\n... />
    # We look for AsciiDiagram with > then {` (content as children not as prop)

    # Find all AsciiDiagram blocks
    $lines = $content -split "`n"
    $newLines = @()
    $i = 0
    while ($i -lt $lines.Count) {
        $line = $lines[$i]
        if ($line -match '<AsciiDiagram\s' -and $line -notmatch '/>' -and $line -match '>$') {
            # Found an opened AsciiDiagram tag (ends with > not />)
            # Check if next non-empty line starts with {`
            $j = $i + 1
            while ($j -lt $lines.Count -and $lines[$j].Trim() -eq '') { $j++ }

            if ($j -lt $lines.Count -and $lines[$j].Trim() -match '^\{`$') {
                # Found {` as child content - need to rewrite
                # Collect opening tag attributes
                $openTag = $line
                $k = $i + 1
                # Read all opening tag lines (they might span multiple lines if multiline attributes)
                # Actually, the tag is already fully on $openTag line since it ends with >
                # But it could be multi-line. Let me check if the tag started on this line
                if ($openTag.TrimStart().StartsWith('<AsciiDiagram')) {
                    # Check if tag actually spans multiple lines by checking if we need more lines
                    # The regex match already has > so the tag is complete
                }

                # Read content between {` and `} or `}/> or `}>
                $contentStart = $j + 1
                $contentLines = @()
                $m = $contentStart
                while ($m -lt $lines.Count) {
                    $cline = $lines[$m]
                    if ($cline.Trim() -match '^`\}') {
                        # Found closing of template literal
                        # This line might have `} alone or `}/> or `}> or `} ... />
                        break
                    }
                    $contentLines += $cline
                    $m++
                }

                if ($m -lt $lines.Count) {
                    # Found the closing line with `}
                    $closeLine = $lines[$m]

                    # Extract remaining attributes (alt, caption) and /> from close line and following lines
                    $remainingProps = @()
                    $remainingLines = @()

                    # Check what's on the closing backtick line after `}
                    $afterBacktick = $closeLine -replace '^.*`\}', ''  # everything after `}
                    if ($afterBacktick.Trim().Length -gt 0) {
                        $remainingLines += $afterBacktick
                    }

                    # Read following lines for more props (alt/caption lines)
                    $n = $m + 1
                    while ($n -lt $lines.Count) {
                        $nline = $lines[$n]
                        if ($nline.Trim() -eq '' -or $nline.Trim() -match '^(alt|caption)=' -or $nline.Trim() -eq '/>') {
                            $remainingLines += $nline
                            if ($nline.Contains('/>')) {
                                $n++
                                break
                            }
                            # If it's an attribute line that doesn't have />, continue
                            if ($nline.Trim() -match '^(alt|caption)=') {
                                # Check if this line or next has />
                                if ($nline.Contains('/>')) {
                                    $n++
                                    break
                                }
                            } else {
                                break
                            }
                        } else {
                            break
                        }
                        $n++
                    }

                    # Rebuild: <AsciiDiagram id="..." title="..." caption="..." content={`\n...\n`} alt="..." />
                    $attrMatch = [regex]::Match($openTag, '<AsciiDiagram\s+(.*)>\s*$')
                    $attrs = if ($attrMatch.Success) { $attrMatch.Groups[1].Value.Trim() } else { '' }

                    # Extract existing attributes from opening tag
                    $idMatch = [regex]::Match($attrs, 'id="([^"]*)"')
                    $titleMatch = [regex]::Match($attrs, 'title="([^"]*)"')
                    $captionMatch = [regex]::Match($attrs, 'caption="([^"]*)"')
                    $altMatch = [regex]::Match($attrs, 'alt="([^"]*)"')

                    $idVal = if ($idMatch.Success) { $idMatch.Value } else { '' }
                    $titleVal = if ($titleMatch.Success) { $titleMatch.Value } else { '' }
                    $captionVal = if ($captionMatch.Success) { $captionMatch.Value } else { '' }
                    $altVal = if ($altMatch.Success) { $altMatch.Value } else { '' }

                    # Extract alt/caption from remaining lines
                    $capFromRemaining = ''
                    $altFromRemaining = ''
                    foreach ($rline in $remainingLines) {
                        if ($rline -match 'caption="([^"]*)"') {
                            $capFromRemaining = 'caption="' + $matches[1] + '"'
                        }
                        if ($rline -match 'alt="([^"]*)"') {
                            $altFromRemaining = 'alt="' + $matches[1] + '"'
                        }
                    }

                    # Build the new tag: prefer caption/alt from opening tag, then from remaining
                    $finalCaption = if ($captionVal -ne '') { $captionVal } elseif ($capFromRemaining -ne '') { $capFromRemaining } else { '' }
                    $finalAlt = if ($altVal -ne '') { $altVal } elseif ($altFromRemaining -ne '') { $altFromRemaining } else { '' }

                    # Build attrs list (preserve order from original)
                    $orderedAttrs = @()
                    if ($idVal -ne '') { $orderedAttrs += $idVal }
                    if ($titleVal -ne '') { $orderedAttrs += $titleVal }

                    # Build the content string
                    $diagContent = $contentLines -join "`n"

                    # Build the new tag
                    $newTagLines = @()
                    $newTagLines += "<AsciiDiagram"
                    if ($orderedAttrs.Count -gt 0) {
                        $newTagLines += "  " + ($orderedAttrs -join "`n  ")
                    }
                    $newTagLines += "  content={`n$diagContent`n  `}"
                    if ($finalAlt -ne '') { $newTagLines += "  $finalAlt" }
                    if ($finalCaption -ne '') { $newTagLines += "  $finalCaption" }
                    $newTagLines[-1] = $newTagLines[-1] + " />"  # Add /> to last line

                    # Skip remaining lines up to and including </AsciiDiagram> if any
                    $skipTo = $n
                    # Look for </AsciiDiagram> in skipped range
                    for ($s = $n; $s -lt $lines.Count; $s++) {
                        if ($lines[$s].Trim() -match '</AsciiDiagram>') {
                            $skipTo = $s + 1
                        } else {
                            break
                        }
                    }

                    # Add the new tag and advance i
                    $newLines += $newTagLines
                    $i = $skipTo

                    $fixed = $true
                    Write-Host "  FIX 6: Converted opened-tag to content prop in $($file.Name) around line $($i+1)"
                    continue
                }
            }
        }
        $newLines += $line
        $i++
    }

    if ($fixed) {
        $content = $newLines -join "`n"
    }

    if ($fixed) {
        # Write back with UTF-8 encoding (no BOM)
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
        $totalFixed++
    }
}

Write-Host "`nDone! $totalFixed files were fixed."