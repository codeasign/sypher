---
description: Generate a complete design pattern topic for the Design Patterns course — one theory page with pseudocode and one domain example, plus complete single-file implementations in JavaScript, TypeScript, Python, Java, C#, and Rust.
---

# /add-design-pattern

Generate a complete design pattern with theory and all 6 language implementations.

## Usage

```
/add-design-pattern TOPIC="Factory Method" SLUG="factory-method" CATEGORY="Creational" DOMAIN="Banking"
```

## Arguments

- `TOPIC` — Pattern name (e.g. `Factory Method`)
- `SLUG` — kebab-case (e.g. `factory-method`)
- `CATEGORY` — Must exactly match one of: Creational, Structural, Behavioral
- `DOMAIN` — Must exactly match one of: Banking, Cars, Stock Market

**Domain assignment (use these — do not deviate):**
- `Creational` → `Banking` (account factories, loan builders, singleton config, currency prototypes)
- `Structural` → `Cars` (engine adapters, feature decorators, manufacturing facade, part composites)
- `Behavioral` → `Stock Market` (price observers, order commands, trading strategies, portfolio state)

---

## CRITICAL — Working Code Requirements

**Run with Claude Sonnet.** Every implementation must be verified against current language specs.

**Every implementation language page must include WORKING, RUNNABLE code — not structural stubs, not pseudocode, not "..." placeholders.** The user must be able to copy-paste the code block and run it directly without adding anything.

Requirements for every language page:
- **Complete, runnable, single-file implementation** — no missing bodies, no `...` or `// ...` ellipsis in the implementation section
- **Same domain example from the theory page** carried through completely
- **`main`/driver at the bottom** that exercises all participants with realistic data and prints output
- **Expected output** shown in a fenced `bash` block immediately after the code block
- **Idiomatic per language** — Rust uses traits and enums, Python uses ABCs and dataclasses, TypeScript uses interfaces and generics
- **No external packages; stdlib only**
- **No aliasing or placeholder comments that skip implementation** — every method body must be fully written
- **Every `.mdx` page MUST have at least one AsciiDiagram** (theory + all 6 language pages)

**Examples of what NOT to do — these are BROKEN patterns that must be avoided:**

```python
# BAD: placeholder body — this is not working code
class AccountFactory:
    def create_account(self, account_type: str):
        # TODO: implement this
        pass

# BAD: structural stub — reader cannot run this
class AccountFactory:
    def create_account(self, account_type: str):
        # Returns appropriate account based on type
        ...
```

```python
# GOOD: complete, working, runnable implementation
class SavingsAccount:
    def __init__(self, account_holder: str, initial_deposit: float):
        self.account_holder = account_holder
        self.balance = initial_deposit
        self.interest_rate = 0.035

    def get_details(self) -> str:
        return f"Savings[{self.account_holder}]: ${self.balance:.2f} @ {self.interest_rate*100}%"

class AccountFactory:
    @staticmethod
    def create_account(account_type: str, holder: str, amount: float):
        if account_type == "savings":
            return SavingsAccount(holder, amount)
        elif account_type == "checking":
            return CheckingAccount(holder, amount)
        raise ValueError(f"Unknown account type: {account_type}")

# Driver
if __name__ == "__main__":
    factory = AccountFactory()
    acc1 = factory.create_account("savings", "Alice", 1000)
    print(acc1.get_details())
```

The theory page may use pseudocode for explanation, but **every language implementation page must contain real, runnable code.**

---

## Files to generate

```
docs/design-patterns/$SLUG/
├── index.md
├── 01-theory.mdx
├── 02-javascript.mdx
├── 03-typescript.mdx
├── 04-python.mdx
├── 05-java.mdx
├── 06-csharp.mdx
└── 07-rust.mdx
```

---

## Page 1 — index.md

```md
---
id: $SLUG
title: $TOPIC Pattern
sidebar_label: $TOPIC
---

import DocCardList from '@theme/DocCardList';

<DocCardList />
```

---

## Page 2 — 01-theory.mdx

**Target length:** 500–700 lines.

**Frontmatter:**
```
---
id: $SLUG-theory
title: "$TOPIC Pattern — Theory"
sidebar_label: Theory
sidebar_position: 1
---
```

**Must import AsciiDiagram after frontmatter:**
```
import AsciiDiagram from '@site/src/components/AsciiDiagram';
```

**Mandatory structure:**

### Intent (no heading — open cold)
One paragraph. GoF-precise intent statement. What problem this pattern solves and how.

### The Problem Without This Pattern
Concrete scenario in the chosen `$DOMAIN`. What breaks, what gets duplicated, what becomes unmaintainable. Show broken pseudocode.

### Structure
ASCII diagram showing participants and relationships:

```
<AsciiDiagram
  id="$SLUG/structure"
  alt="$TOPIC Pattern Structure — participants and relationships"
  caption="Participants: [list them]"
  content={`
  [Creator]
      │ creates
      ▼
  [Product Interface]
      ▲
      │ implements
  [Concrete Product]
  `} />
```

### Pseudocode — $DOMAIN Example
Complete pseudocode implementing the pattern in `$DOMAIN`. Label each participant. Minimum 40 lines. Show the full interaction — not just structure but behavior.

```
// PSEUDOCODE — $TOPIC in $DOMAIN context
// Participants labeled with [ROLE]

[CREATOR]
  method factoryMethod(type):
    ...
```

### How It Works — Step by Step
Numbered walkthrough of the pseudocode. Minimum 6 steps. What happens at each call, which participant handles it, what is returned.

### When to Use
Bullet list — concrete signals that this pattern is appropriate. Reference `$DOMAIN` examples.

### When NOT to Use
Bullet list — over-engineering signals. When a simpler solution (a map, a function, a switch) is better.

### Real-World Occurrences
Where this pattern appears in well-known frameworks/libraries. Specific, verifiable. Minimum 4 examples across different ecosystems (Node.js, Spring, .NET, Python stdlib, Rust crates).

### Comparison with Related Patterns
Table: related pattern | key difference | when to choose instead.

### Diagram Placement Rules — MANDATORY

- The theory page MUST have at least 1 AsciiDiagram
- Ideally: one diagram in **Structure** (showing participants/relationships) AND optionally a second in **How It Works** (showing the flow)
- Use `content` prop (NOT children) — `<AsciiDiagram ... content={`...`} />`
- `alt` and `caption` props must appear BEFORE `content` on the opening tag
- No blank line inside the template literal
- Explicit `/>` self-close

**MDX Safety and Rendering Rules — MANDATORY:**
- No bare `<` before digits in prose
- No raw `{` or `}` in prose outside fenced code blocks
- No `:::` admonitions
- No unescaped colon in frontmatter title — wrap in quotes
- No "reader"/"user"/"learner" — address as "you"
- AsciiDiagram: always use `content` prop not children; `alt` and `caption` BEFORE `content`; no blank line inside content block; explicit `/>` self-close
- Import AsciiDiagram only if used
- UTF-8 encoding on all file writes — never cp1252
- Every fenced code block: language tag + matching closing fence
- Frontmatter: exactly `---` first — no BOM, whitespace, or stray character

---

## Pages 3–8 — Language implementation pages

**CRITICAL: Each page must contain exactly ONE fenced code block that is a complete, runnable program.** This is the most important requirement. The reader must be able to copy-paste that single code block and run it directly — no modifications, no additions, no separate files.

Generate one page per language:
- `02-javascript.mdx` — JavaScript ES2022+
- `03-typescript.mdx` — TypeScript strict
- `04-python.mdx` — Python 3.11+
- `05-java.mdx` — Java 17+
- `06-csharp.mdx` — C# 12 / .NET 8
- `07-rust.mdx` — Rust 2021 edition

**Frontmatter per page:**
```
---
id: $SLUG-<language>
title: "$TOPIC Pattern — <Language>"
sidebar_label: <Language>
sidebar_position: <2–7>
---
```

**Target length per page:** 250–450 lines.

**Mandatory structure per language page:**

### Overview paragraph (before the code block)
Start with one paragraph describing the domain and what the implementation demonstrates. This paragraph is rendered as page text — it introduces the reader to the code they are about to see.

### AsciiDiagram (after overview, before first code block)
Every language page MUST include an AsciiDiagram component showing the pattern's participants and their relationships in the chosen domain. Add `import AsciiDiagram from '@site/src/components/AsciiDiagram';` after the frontmatter.

```mdx
import AsciiDiagram from '@site/src/components/AsciiDiagram';

## Implementation

[overview paragraph]

<AsciiDiagram id="$SLUG/<language>" alt="..." caption="..." content={`...`} />
```

IMPORTANT: The diagram must use `content` prop (not children), `alt` and `caption` BEFORE `content`, and no blank lines inside the template literal.

### How the Implementation Works

Before showing code, explain the design using pseudocode that mirrors a class diagram. Map each participant to its OOP role and show which SOLID principles it follows. Be specific — reference the actual classes and methods.

**Structure of this section:**

```
## How the Implementation Works

### Class Diagram (Pseudocode)

// ── Participant Diagram ──
//
//   ┌─────────────────────────────┐
//   │   <<interface>>             │
//   │   Participant (Product)     │  ← OOP: Abstraction
//   ├─────────────────────────────┤     ISP: segregated interface
//   │ + operation(): returnType   │
//   └──────────┬──────────────────┘
//              ▲ implements
//   ┌──────────┴──────────┐
//   │                     │
//   ┌──────────────┐ ┌──────────────┐
//   │ Concrete A   │ │ Concrete B   │  ← OOP: Polymorphism
//   ├──────────────┤ ├──────────────┤     LSP: substitutable
//   │ operation()  │ │ operation()  │     OCP: open for extension
//   └──────────────┘ └──────────────┘
//
//   ┌─────────────────────────────┐
//   │ Creator (Factory)           │  ← OOP: Encapsulation
//   ├─────────────────────────────┤     SRP: single reason to change
//   │ + factoryMethod(type): Prod │     DIP: depends on abstraction
//   └─────────────────────────────┘

### OOP Concepts Applied

1. **Encapsulation** — [which class hides what data/details]
2. **Abstraction** — [which interface/trait defines the contract]
3. **Inheritance** — [which classes extend/share behavior]
4. **Polymorphism** — [which method behaves differently per type]

### SOLID Principles Applied

5. **SRP** — [which class has one reason to change]
6. **OCP** — [how new types can be added without modifying existing code]
7. **LSP** — [why concrete types are substitutable for their base type]
8. **ISP** — [how interfaces are kept small and focused]
9. **DIP** — [how high-level code depends on abstractions, not concretions]
```

### The Code Block — Complete Working Program

**This is a single fenced code block containing the entire program.** There must be exactly one code block on the page (plus the expected-output bash block after it). The code block must contain a complete, runnable, self-contained program.

**Required structure of the code block:**

```
// $TOPIC Pattern — $LANGUAGE — $DOMAIN example
// ============================================
// Participants: [list all participants by name]
// OOP: [abstraction, encapsulation, inheritance, polymorphism]
// SOLID: [SRP, OCP, LSP, ISP, DIP] — which principles are demonstrated
// ============================================

// ── Participant 1: [Interface / Trait / Abstract Class] ──
// OOP role: Abstraction + ISP (small, focused contract)
// SOLID: ISP, DIP

// ── Participant 2: [Concrete Implementation 1] ──
// OOP role: Inheritance/Polymorphism
// SOLID: LSP (substitutable), OCP (extensible), SRP (one responsibility)

// ── Participant 3: [Concrete Implementation 2] ──
// ...complete method bodies with real logic...

// ── Client code / Composition Root ──
// OOP role: Composition over inheritance
// SOLID: DIP (depends on abstractions), SRP (orchestrates, doesn't implement)

// ── Main / Driver ──
// ...exercises all participants with realistic domain data, prints output
```

**HARD RULES for the code block:**

1. **NO `pass`, `...`, `// TODO`, `unimplemented!()`, `NotImplementedError`, `throw new Error("not implemented")`, or any other placeholder** — every method body must have real logic that computes or returns a meaningful value using the input parameters

2. **NO structural stubs** — if a method signature appears in the interface, its concrete implementation must have a complete body. Example of what is BANNED:
   ```python
   # BANNED — method body is a stub
   def get_details(self) -> str:
       ...

   # BANNED — method body is a stub
   def get_details(self) -> str:
       pass

   # BANNED — method body is a stub
   def get_details(self) -> str:
       raise NotImplementedError

   # GOOD — complete method body
   def get_details(self) -> str:
       return f"Savings[${self.account_holder}]: $${self.balance:.2f} @ {self.interest_rate*100}%"
   ```

3. **All participants fully implemented** — every interface/trait/abstract class must have concrete classes with all methods filled in. No inheritance chains that skip method bodies.

4. **A `main`/driver at the bottom** that:
   - Creates instances of the concrete participants
   - Calls the pattern's methods with realistic domain data
   - Prints the results to stdout
   - Uses realistic data:
     - **Banking:** account holder names (Alice, Bob, Carol), dollar amounts (1000.00, 25000.00), interest rates (3.5%, 6.75%)
     - **Cars:** model names (Tesla Model 3, Toyota Camry), engine specs (2.0L turbo, 150kW electric), prices
     - **Stock Market:** ticker symbols (AAPL, GOOGL, MSFT), share prices, quantities

5. **Expected output** in a fenced `bash` block immediately after the code block — the exact output the program produces when run

**Full example of a well-formed language page (Factory Method in Banking — Python):**

```mdx
---
id: factory-method-python
title: "Factory Method Pattern — Python"
sidebar_label: Python
sidebar_position: 4
---

import AsciiDiagram from '@site/src/components/AsciiDiagram';

## Implementation

Below is a complete Python implementation of the Factory Method pattern using a banking domain. The `AccountFactory` encapsulates account creation logic so that adding new account types doesn't require changing client code. The implementation demonstrates OOP concepts (abstraction, encapsulation, inheritance, polymorphism) and applies SOLID principles (SRP, OCP, LSP, ISP, DIP).

<AsciiDiagram id="factory-method/python" alt="Factory Method structure for account creation in Python" caption="AccountFactory creates SavingsAccount, CheckingAccount, and LoanAccount objects" content={`
  ┌────────────────┐
  │ AccountFactory │── Creator
  │ create_account │
  └───────┬────────┘
          │ <<create>>
          ▼
  ┌────────────────┐
  │   Account      │── Product interface
  └────────────────┘
          ▲
  ┌───────┴────────┬───────────┐
  │                │           │
  ▼                ▼           ▼
  Savings      Checking    LoanAccount
  Account       Account    ── Concrete
  ── Concrete  ── Concrete   Products
    Products     Products
  └───────┴────────┴───────────┘
`} />

### How the Implementation Works

#### Class Diagram (Pseudocode)

```
// ── Participant Diagram ──
//
//   ┌──────────────────────────────────┐
//   │   <<abstract class>>             │
//   │   Account (Product)              │ ← OOP: Abstraction
//   ├──────────────────────────────────┤    ISP: focused interface
//   │ + get_details() -> str           │     (only account behavior)
//   │ + get_balance() -> float         │
//   └────────────────┬─────────────────┘
//                    ▲ inherits
//   ┌────────────────┴─────────────────┐
//   │                                  │
//   ┌──────────────────┐   ┌──────────────────────┐
//   │ SavingsAccount   │   │ CheckingAccount      │ ← OOP: Polymorphism
//   ├──────────────────┤   ├──────────────────────┤    LSP: both are
//   │ - balance: float │   │ - overdraft: float   │     substitutable
//   │ - rate: float    │   │ + get_details()      │     for Account
//   │ + get_details()  │   │ + get_balance()      │
//   └──────────────────┘   └──────────────────────┘
//
//   ┌──────────────────────────────────┐
//   │ AccountFactory (Creator)         │ ← OOP: Encapsulation
//   ├──────────────────────────────────┤    SRP: only creates accounts
//   │ + create_account(type, ...)      │    OCP: new types = new classes
//   │     -> Account                    │    DIP: returns Account, not
//   └──────────────────────────────────┘     concrete types
```

#### OOP Concepts Applied

1. **Abstraction** — `Account` is an abstract base class defining the contract. Clients depend on `Account`, not concrete types.
2. **Encapsulation** — Each account class hides its internal data (balance, interest rate, overdraft limit) behind `get_details()` and `get_balance()` methods.
3. **Inheritance** — `SavingsAccount`, `CheckingAccount`, and `LoanAccount` all inherit from `Account` and share the common interface.
4. **Polymorphism** — The driver iterates over a list of `Account` objects and calls `get_details()` on each. The correct implementation runs per type without `isinstance` checks.

#### SOLID Principles Applied

5. **SRP** — `AccountFactory` only creates accounts. Each account class only represents its own type. No class does more than one thing.
6. **OCP** — Adding a new `BusinessAccount` class requires zero changes to `AccountFactory` (just add a new `elif` branch) or the client code. The system is open for extension, closed for modification.
7. **LSP** — Every concrete account type can substitute `Account` without breaking the client. The driver calls `get_details()` on any `Account` reference and gets the correct output.
8. **ISP** — The `Account` interface is minimal: only `get_details()` and `get_balance()`. No class is forced to implement methods it doesn't need.
9. **DIP** — Client code depends on the abstract `Account` class, not on concrete account types. The factory returns `Account`, and the driver treats all accounts uniformly.

```python
# Factory Method Pattern — Python — Banking example
# ==================================================
# Participants: Account (Product), SavingsAccount,
# CheckingAccount, LoanAccount (Concrete Products),
# AccountFactory (Creator)
# OOP: abstraction, inheritance, polymorphism, encapsulation
# SOLID: SRP, OCP, LSP, ISP, DIP
# ==================================================

from abc import ABC, abstractmethod
from dataclasses import dataclass

# ── Product ──
class Account(ABC):
    """Abstract product — all account types implement this"""

    @abstractmethod
    def get_details(self) -> str:
        ...

    @abstractmethod
    def get_balance(self) -> float:
        ...

# ── Concrete Products ──
@dataclass
class SavingsAccount(Account):
    account_holder: str
    balance: float
    interest_rate: float = 0.035

    def get_details(self) -> str:
        return (f"Savings[{self.account_holder}]: "
                f"${self.balance:.2f} @ {self.interest_rate*100}%")

    def get_balance(self) -> float:
        return self.balance

@dataclass
class CheckingAccount(Account):
    account_holder: str
    balance: float
    overdraft_limit: float = 500.0

    def get_details(self) -> str:
        return (f"Checking[{self.account_holder}]: "
                f"${self.balance:.2f}, overdraft ${self.overdraft_limit:.2f}")

    def get_balance(self) -> float:
        return self.balance

@dataclass
class LoanAccount(Account):
    account_holder: str
    principal: float
    apr: float = 6.75

    def get_details(self) -> str:
        return (f"Loan[{self.account_holder}]: "
                f"${self.principal:.2f} at {self.apr}% APR")

    def get_balance(self) -> float:
        return -self.principal

# ── Creator ──
class AccountFactory:
    """Factory Method — creates account objects based on type"""

    @staticmethod
    def create_account(account_type: str, holder: str,
                       amount: float) -> Account:
        if account_type == "savings":
            return SavingsAccount(holder, amount)
        elif account_type == "checking":
            return CheckingAccount(holder, amount)
        elif account_type == "loan":
            return LoanAccount(holder, amount)
        else:
            raise ValueError(f"Unknown account type: {account_type}")

# ── Main / Driver ──
if __name__ == "__main__":
    factory = AccountFactory()

    accounts = [
        factory.create_account("savings", "Alice", 1000.0),
        factory.create_account("checking", "Bob", 2500.0),
        factory.create_account("loan", "Carol", 50000.0),
    ]

    for account in accounts:
        print(account.get_details())
```

Expected output:

```bash
Savings[Alice]: $1000.00 @ 3.5%
Checking[Bob]: $2500.00, overdraft $500.00
Loan[Carol]: $50000.00 at 6.75% APR
```

### Language-Specific Notes
4–6 bullets covering:
- **OOP concepts** — how this language implements abstraction, encapsulation, inheritance, polymorphism (e.g., Python uses ABCs + dataclasses, Java uses interface + sealed classes, Rust uses traits + enums with trait objects for polymorphism)
- **SOLID in practice** — which SOLID principles are most naturally expressed in this language (e.g., Rust's trait system enforces ISP naturally, Java's sealed classes support OCP, C# records make SRP easy)
- **Idiomatic patterns** — specific language features leveraged (TypeScript generics + discriminated unions, C# records, JavaScript ES2022+ private fields, Rust's `Box<dyn Trait>` for polymorphism)
- Not design pattern theory — language mechanics only.

**Same MDX safety rules as theory page.**

---

## Sidebar entry

Target file: `sidebars/design-patterns.json`, top-level key `designPatternsSidebar`.
`"Creational"`, `"Structural"`, `"Behavioral"` are top-level categories in this array (no
outer "Design Patterns" wrapper — the course itself is Design Patterns, so a same-named
wrapper would be redundant). Locate the top-level `$CATEGORY` category directly.

**If the file does not exist, create it with the three top-level categories:**

```json
{
  "designPatternsSidebar": [
    "design-patterns/index",
    { "type": "category", "label": "Creational", "collapsible": true, "collapsed": false, "items": [] },
    { "type": "category", "label": "Structural", "collapsible": true, "collapsed": true, "items": [] },
    { "type": "category", "label": "Behavioral", "collapsible": true, "collapsed": true, "items": [] }
  ]
}
```

**Then append the new pattern to the matching top-level `$CATEGORY`'s `"items"`:**

```json
{
  "type": "category",
  "label": "$TOPIC",
  "collapsible": true,
  "collapsed": true,
  "items": [
    "design-patterns/$SLUG/$SLUG-theory",
    "design-patterns/$SLUG/$SLUG-javascript",
    "design-patterns/$SLUG/$SLUG-typescript",
    "design-patterns/$SLUG/$SLUG-python",
    "design-patterns/$SLUG/$SLUG-java",
    "design-patterns/$SLUG/$SLUG-csharp",
    "design-patterns/$SLUG/$SLUG-rust"
  ]
}
```

---

## Post-generation: diagram verification

After writing all 8 files, run this check to ensure all pages have AsciiDiagrams:

```bash
for f in docs/design-patterns/$SLUG/*.mdx; do
  count=$(grep -c '<AsciiDiagram' "$f")
  name=$(basename "$f")
  if [ "$count" -eq 0 ]; then echo "MISSING DIAGRAM: $name"; fi
done
```

If any file has 0 diagrams, add an AsciiDiagram between the intro paragraph and the first code block. Each page must have at least 1 diagram.

---

## Post-generation: run /fix-rendered-content

After writing all files and verifying diagrams exist, run `/fix-rendered-content design-patterns/$SLUG` to catch any A5 (alt/caption ordering) or Defect E (children prop) issues.

---

## Pre-flight validation

After the fix pass, run `npm run check:mdx` — MDX syntax only, no full build.
Fix any errors per MDX Safety Rules above. Retry up to 3 times. Flag persistent failures as NEEDS MANUAL REVIEW.

Do NOT run `npm start` or `npm run build`.

---

## Batch generation (multiple patterns at once)

When generating multiple design patterns, use parallel agents for efficiency. After all agents complete:

1. Verify all files exist (N patterns × 8 files each)
2. Update `sidebars/design-patterns.json` — add all patterns under their matching top-level category (Creational/Structural/Behavioral)
3. Verify every `.mdx` file has at least 1 AsciiDiagram (see verification step above)
4. Run `/fix-rendered-content` on all generated directories
5. Build fails are expected for sidebar context issues unrelated to new content — confirm no MDX syntax errors

---

## Final output

| File | Lines | Domain Consistent | No Placeholders | Runnable Driver | Expected Output | Status |
|---|---|---|---|---|---|---|
| 01-theory.mdx | N | ✅ | — | — | — | ✅ |
| 02-javascript.mdx | N | ✅ | ✅ | ✅ | ✅ | ✅ |
| 03-typescript.mdx | N | ✅ | ✅ | ✅ | ✅ | ✅ |
| 04-python.mdx | N | ✅ | ✅ | ✅ | ✅ | ✅ |
| 05-java.mdx | N | ✅ | ✅ | ✅ | ✅ | ✅ |
| 06-csharp.mdx | N | ✅ | ✅ | ✅ | ✅ | ✅ |
| 07-rust.mdx | N | ✅ | ✅ | ✅ | ✅ | ✅ |