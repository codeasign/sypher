#!/usr/bin/env node
// Deterministic, non-LLM classification of an ASCII/Unicode-box-drawing
// diagram's likely Mermaid type, by pattern-matching its raw `content`
// text. Pure structural heuristics — never calls a model. Exists so
// wire-ascii-diagrams / convert-ascii-diagrams don't have to spend an LLM
// judgment call on every single diagram just to pick a type; only
// genuinely ambiguous ones fall back to human/LLM judgment.
//
// Usage:
//   node scripts/classify-diagram-type.mjs <course-slug> [more-slugs...]
//   node scripts/classify-diagram-type.mjs --file <path/to/one.mdx>
//   node scripts/classify-diagram-type.mjs <course-slug> --id <ascii-diagram-id>
//
// Output: JSON array to stdout, one entry per diagram:
//   { id, file, diagramIndex, recommendedType, confidence, scores, signals }
// confidence is "clear-match" or "ambiguous". "ambiguous" entries include
// a `reason` explaining the conflict — that's the human/LLM's cue to make
// the call themselves instead of trusting the script.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const DOCS_ROOT = path.join(REPO_ROOT, 'apps', 'docs', 'docs');

// Empirically verified against this repo's own rendered SVGs (aria-roledescription):
// flowchart-v2 -> flowchart, sequence -> sequenceDiagram, class -> classDiagram,
// er -> erDiagram, stateDiagram -> stateDiagram-v2. Kept here as documentation,
// not used at runtime (analyze-diagram-types.md reads roledescription directly).
export const RENDERED_ROLE_TO_TYPE = {
  'flowchart-v2': 'flowchart',
  sequence: 'sequenceDiagram',
  class: 'classDiagram',
  er: 'erDiagram',
  stateDiagram: 'stateDiagram-v2',
};

// ---------- JSX <AsciiDiagram> extraction (brace/backtick-aware) ----------
// Kept in sync with the other conversion scripts' scanners deliberately,
// not imported — these are standalone CLI scripts with no shared module.

function extractAsciiDiagramTags(source) {
  const tags = [];
  const OPEN = '<AsciiDiagram';
  let i = 0;
  while (true) {
    const start = source.indexOf(OPEN, i);
    if (start === -1) break;
    let j = start + OPEN.length, braceDepth = 0, inBacktick = false, end = -1;
    while (j < source.length) {
      const ch = source[j];
      if (inBacktick) { if (ch === '\\') { j += 2; continue; } if (ch === '`') inBacktick = false; j++; continue; }
      if (ch === '`') { inBacktick = true; j++; continue; }
      if (ch === '{') { braceDepth++; j++; continue; }
      if (ch === '}') { braceDepth--; j++; continue; }
      if (braceDepth === 0 && ch === '/' && source[j + 1] === '>') { end = j + 2; break; }
      j++;
    }
    if (end === -1) { i = start + OPEN.length; continue; }
    tags.push({ start, end, text: source.slice(start, end) });
    i = end;
  }
  return tags;
}

function getAttr(tagText, name) {
  const m = tagText.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : null;
}

function getContentValue(tagText) {
  const m = tagText.match(/content=\{`([\s\S]*?)`\}/);
  return m ? m[1] : null;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (entry.endsWith('.mdx') || entry.endsWith('.md')) out.push(full);
  }
  return out;
}

// ---------- signal detectors ----------
// Each returns a non-negative score contribution and, if > 0, a short
// human-readable label describing what matched (surfaced in the report so
// a reviewer can sanity-check the classifier's reasoning, not just trust
// a bare number).

function scoreClass(content) {
  let score = 0;
  const signals = [];

  // Each individual detector below is deliberately treated as *weak*
  // evidence on its own and gated behind a corroboration requirement in
  // the scoring below it — validation against real content in this repo
  // found that every one of these signals, taken alone, produces false
  // positives: a "├────┤" title-bar divider is a generic box-header
  // convention used across ordinary flowcharts (not just class boxes);
  // bare "implements"/"extends" can appear in descriptive prose inside a
  // non-UML diagram; a single "+label(...)"-shaped line can be
  // coincidental. Only when two or more independent signal families
  // agree — or the unambiguous `<<stereotype>>` marker is present — does
  // this function report real (non-capped) score.
  const stereotypeMatch = /<<\s*(interface|abstract|enum)/i.test(content);
  if (stereotypeMatch) signals.push('stereotype (<<interface>>/<<abstract>>/<<enum>>)');

  // A box-divider line: dashes flanked by real box-side/junction chars
  // (│, |, ├/┤) on both ends of the whole trimmed line. Requiring both
  // flanking chars (not optional) excludes plain connector lines between
  // stacked flowchart boxes (a lone indented "│" or "▼") and plain-text
  // table separator rows, both of which matched an earlier looser version
  // of this regex during validation.
  const dividerLines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[│|├][─\-_]{6,}[│|┤]$/.test(l));
  if (dividerLines.length > 0) signals.push(`box divider line(s) (${dividerLines.length})`);

  // Visibility-marker method signatures: +/-/#/~ then an identifier then
  // a parenthesized (possibly empty) arg list — the UML member-list tell.
  const methodLines = content.match(/^[\s│|]*[+\-#~]\s*\w[\w.]*\([^)]*\)/gm) || [];
  if (methodLines.length > 0) signals.push(`visibility-marker method signatures (${methodLines.length})`);

  const relLabels = content.match(/\b(implements|extends|impl for)\b/gi) || [];
  if (relLabels.length > 0) signals.push(`relationship label(s) (${[...new Set(relLabels.map((s) => s.toLowerCase()))].join(', ')})`);

  const corroborationCount = [dividerLines.length > 0, methodLines.length > 0, relLabels.length > 0].filter(Boolean).length;

  if (stereotypeMatch) {
    score = 3 + Math.min(methodLines.length, 2) + Math.min(relLabels.length, 2) + (dividerLines.length > 0 ? 1 : 0);
  } else if (corroborationCount >= 2) {
    score = 2 + Math.min(methodLines.length, 2) + Math.min(relLabels.length, 1);
  } else {
    // At most one weak signal present with nothing corroborating it —
    // not enough to recommend classDiagram on its own.
    score = Math.min(corroborationCount, 1);
  }

  return { score, signals };
}

function scoreSequence(content) {
  const signals = [];

  const numberedSteps = content.match(/^\s*(?:step\s*)?\d+[.):]/gim) || [];
  if (numberedSteps.length >= 3) signals.push(`numbered sequential steps (${numberedSteps.length})`);

  // Protocol vocabulary (GET/POST/"request"/"200 OK"...) is common in
  // ordinary static architecture boxes that merely *mention* an API
  // route or status code — validation found this alone produces false
  // positives on single-box architecture diagrams. Treated as weak.
  const protocolTokens = content.match(/\b(GET|POST|PUT|DELETE|PATCH|ACK|SYN|request|response|\d{3}\s*(OK|Created|Not Found|Error))\b/g) || [];
  if (protocolTokens.length >= 2) signals.push(`request/response tokens (${protocolTokens.length})`);

  // Two-column swimlane shape: several short horizontal arrows (--> / <--
  // / -> / <-) on lines with no box-drawing side characters, suggesting
  // back-and-forth message passing between actors rather than a static
  // boxed structure. This is the strongest of the three signals — real
  // structural evidence rather than vocabulary — so it alone can clear
  // the corroboration bar if there are enough of them.
  const backAndForthArrows = content.match(/^[^│┌└├]*(-{1,3}>|<-{1,3})[^│┌└├]*$/gm) || [];
  if (backAndForthArrows.length > 0) signals.push(`back-and-forth arrow lines (${backAndForthArrows.length})`);

  // Real arrow structure is a mandatory gate, not just one vote among
  // three — validation found "numbered steps + protocol vocabulary"
  // alone (no actual back-and-forth arrows) reliably false-positives on
  // ordinary linear multi-step flowcharts describing an internal
  // pipeline (e.g. "Step 1 ... Step 6" boxes chained top-to-bottom with
  // plain "│" connectors) — narrative step numbering and API vocabulary
  // are common there too and carry no real signal about actor structure.
  let score;
  if (backAndForthArrows.length >= 5) {
    score = 3; // real structural evidence, strong enough alone
  } else if (backAndForthArrows.length >= 1 && (numberedSteps.length >= 3 || protocolTokens.length >= 2)) {
    score = 2 + Math.min(backAndForthArrows.length, 2);
  } else {
    const weakCount = [numberedSteps.length >= 3, protocolTokens.length >= 2, backAndForthArrows.length >= 1].filter(Boolean).length;
    score = Math.min(weakCount, 1);
  }

  return { score, signals };
}

function scoreEr(content) {
  let score = 0;
  const signals = [];

  // Require a literal `*` on at least one side (1..*, 0..*, *..1, *..*) —
  // real UML/ER cardinality notation is built around expressing "many",
  // so genuine cases almost always include it. A bare numeric..numeric
  // range ("index 0..3") is common outside ER contexts too — a pandas
  // row-index range produced exactly this false positive in validation —
  // so it carries no signal on its own without the asterisk.
  const cardinality = content.match(/\b(?:\d+\s*\.\.\s*\*|\*\s*\.\.\s*\d+|\*\s*\.\.\s*\*)\b/g) || [];
  if (cardinality.length > 0) {
    score += 3;
    signals.push(`cardinality notation (${[...new Set(cardinality)].join(', ')})`);
  }

  return { score, signals };
}

function scoreState(content) {
  let score = 0;
  const signals = [];

  if (/\[\*\]/.test(content)) {
    score += 2;
    signals.push('explicit start/end marker ([*])');
  }
  const transitionLabels = content.match(/\b(on\s+\w+|when\s+\w+|success|failure|error|retry|timeout)\b/gi) || [];
  if (transitionLabels.length >= 2) {
    score += 1;
    signals.push(`state-transition-style labels (${transitionLabels.length})`);
  }

  return { score, signals };
}

// Narrative/before-after panel structure: two or more distinct
// contrasting section headers, usually meaning the diagram is a
// comparison layout rather than a single structural/behavioral type —
// best served by flowchart+subgraphs, never a clean single-type match.
function detectNarrativePanels(content) {
  const headerPairs = [
    /\bviolation\b/i, /\bcorrect\b/i,
    /\bbefore\b/i, /\bafter\b/i,
    /\bnaive\b/i, /\bproduction\b/i,
    /\bwrong\b/i, /\bright\b/i,
  ];
  const hits = headerPairs.filter((re) => re.test(content));
  return hits.length >= 2;
}

function classify(content) {
  const cls = scoreClass(content);
  const seq = scoreSequence(content);
  const er = scoreEr(content);
  const state = scoreState(content);
  const narrative = detectNarrativePanels(content);

  const scores = {
    classDiagram: cls.score,
    sequenceDiagram: seq.score,
    erDiagram: er.score,
    'stateDiagram-v2': state.score,
  };
  const signals = {
    classDiagram: cls.signals,
    sequenceDiagram: seq.signals,
    erDiagram: er.signals,
    'stateDiagram-v2': state.signals,
  };

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = ranked[0];
  const [, secondScore] = ranked[1];

  if (narrative && topScore > 0) {
    return {
      recommendedType: 'ambiguous',
      confidence: 'ambiguous',
      reason: 'narrative/before-after panel structure detected alongside structural signals — better served by flowchart+subgraphs than any single diagram type',
      scores,
      signals,
    };
  }

  if (topScore === 0) {
    return { recommendedType: 'flowchart', confidence: 'clear-match', reason: 'no classDiagram/sequenceDiagram/erDiagram/stateDiagram-v2 signals found; flowchart is the default for architecture/relationship content', scores, signals };
  }

  // Clear match: top type has a real signal and isn't within 1 point of
  // the runner-up (a near-tie means the content genuinely mixes signals
  // from two types, which is exactly what "ambiguous" exists to flag).
  if (topScore >= 2 && topScore - secondScore >= 2) {
    return { recommendedType: topType, confidence: 'clear-match', reason: `${topType} signals clearly dominate`, scores, signals };
  }

  return {
    recommendedType: 'ambiguous',
    confidence: 'ambiguous',
    reason: `top candidate (${topType}, score ${topScore}) does not clearly dominate the runner-up (score ${secondScore}) — mixed or weak signals`,
    scores,
    signals,
  };
}

// ---------- main ----------

function classifyFile(file) {
  const source = readFileSync(file, 'utf8');
  const tags = extractAsciiDiagramTags(source);
  const relFile = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
  const results = [];

  tags.forEach((tag, idx) => {
    const id = getAttr(tag.text, 'id');
    const content = getContentValue(tag.text);
    if (content === null) return; // not the expected shape

    const result = classify(content);
    results.push({
      id: id || null,
      file: relFile,
      diagramIndex: idx + 1,
      ...result,
    });
  });

  return results;
}

function main() {
  const rawArgs = process.argv.slice(2);
  const fileFlagIdx = rawArgs.indexOf('--file');
  const idFlagIdx = rawArgs.indexOf('--id');
  const idFilter = idFlagIdx !== -1 ? rawArgs[idFlagIdx + 1] : null;

  let allResults = [];

  if (fileFlagIdx !== -1) {
    const filePath = path.resolve(rawArgs[fileFlagIdx + 1]);
    allResults = classifyFile(filePath);
  } else {
    const slugs = rawArgs.filter((a, i) => !a.startsWith('--') && rawArgs[i - 1] !== '--id');
    if (slugs.length === 0) {
      console.error('Usage: node scripts/classify-diagram-type.mjs <course-slug> [more...] | --file <path> [--id <ascii-diagram-id>]');
      process.exit(1);
    }
    for (const slug of slugs) {
      const courseDir = path.join(DOCS_ROOT, slug);
      if (!existsSync(courseDir)) { console.error(`Skipping "${slug}" — not found at ${courseDir}`); continue; }
      for (const file of walk(courseDir).sort()) {
        allResults.push(...classifyFile(file));
      }
    }
  }

  if (idFilter) {
    allResults = allResults.filter((r) => r.id === idFilter);
  }

  console.log(JSON.stringify(allResults, null, 2));
}

main();
