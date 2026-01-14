# Briefing — Build Toolchain Fix (TypeScript / Node / tsconfig / build output)

## Status / Kontext

- Phase 1.7 (GitHub Actions) ist **pausiert**. Keine Änderungen an CI oder Infra sind Teil dieses Briefings.
- STEP 1 (CI Build Workflow) ist abgeschlossen; ein `npm run build`-Fehlschlag ist **kein** Workflow-Problem.
- Aktueller Zustand im Repo:
  - `npm test` ist **grün**.
  - `npm run build` (`tsc -p tsconfig.json`) ist **rot**.

## Ziel

Das Kommando `npm run build` muss **deterministisch** und reproduzierbar auf Node.js **20.x** (wie in `package.json`/Dockerfile) erfolgreich durchlaufen und `dist/` erzeugen, ohne Laufzeit-Semantik zu verändern.

## Hard Constraints (müssen eingehalten werden)

- **Keine Änderungen an CI oder Infra** (keine `.github/workflows/**`, keine Docker-/Compose-Änderungen).
- **Kein** Eingriff in `src/core/**`.
- **Keine** Änderung der Runtime-Semantik (nur Typen / Build-Konfiguration / Output-Grenzen).
- Keine impliziten Defaults; Fail-fast-Prinzip bleibt erhalten.
- Tests müssen grün bleiben.

## Faktenlage (Quelle: Repo-Stand)

### tsconfig (aktuell)

- `tsconfig.json`:
  - `module`/`moduleResolution`: `NodeNext`
  - `strict: true`
  - `outDir: dist`, `rootDir: .`
  - `include`: `["src/**/*.ts", "tests/**/*.ts"]`

=> **Wichtig**: Der Build kompiliert aktuell **src + tests** mit `strict`.

### Observed Build Errors (Kategorien)

**A) Node-Typen fehlen**

- Fehler wie „Cannot find module 'node:fs'…“ und „Cannot find name 'process'…“ deuten darauf hin, dass im Build **keine Node-Type-Definitions** verfügbar/aktiv sind.
- Im `package.json` existiert aktuell **kein** `@types/node`.

**B) Strict TypeScript errors in runtime code**

- `src/runtime/index.ts`: mehrere Handler-Parameter sind implizit `any` (`err`, `hadError`, `reason`) → `noImplicitAny` (via `strict`) schlägt zu.
- `src/runtime/persistence/filesystem.ts` (aus Build-Output): ähnliche `noImplicitAny`-Fehler + Node-Imports.

**C) Literal-Union-Widening (AuditEvent.type wird zu string)**

- In `src/runtime/meta/meta_orchestrator_v1.ts` ist `auditBase(logicalTime, type: string, id)` so typisiert, dass `type` **immer** als `string` zurückkommt.
- Danach werden Events als `DecisionEvaluatedEvent`/etc. annotiert, deren `type` aber ein **String-Literal** sein muss (z.B. `"DECISION_EVALUATED"`). Durch das Widening wird daraus `string` → Typfehler.

**D) Tests verursachen zusätzliche Compile-Errors (weil im Build inkludiert)**

- `tests/core/audit_persistence_contracts.test.ts`:
  - `@ts-expect-error` ist „unused“ (weil der erwartete Fehler nicht mehr entsteht) → das ist ein reines **Test-Typing**-Thema.
- `tests/core/order_intent_creation.test.ts`:
  - Typfehler deuten auf Drift zwischen Test-Typannahmen und tatsächlichen Typen (`OrderIntentCreationOutput`) hin.

## Vermutete Root Causes

1. **Toolchain-Konfiguration**: Node-Typen sind weder als Dependency vorhanden noch im Compiler aktiviert.
2. **Build-Grenze ist unsauber**: `tsc`-Build kompiliert Tests mit, obwohl `npm test` separat via Vitest läuft.
3. **TS-Strictness trifft untypisierte Parameter**: `strict` erzwingt explizite Typen (z.B. `unknown`, `boolean`).
4. **AuditEvent-Factory typisiert zu breit**: `type: string` im Helper verhindert String-Literal-Typen und bricht Unions.

## Fix-Plan (minimal, explizit, auditierbar)

### Step 0 — Definition of Done (Acceptance Criteria)

- `npm run build` ist grün auf Node.js **20.x**.
- `npm test` bleibt grün.
- `dist/src/runtime/index.js` und die Runtime-Outputs werden erzeugt.
- Keine Änderungen an `src/core/**`, keine Änderungen an CI/Infra.

### Step 1 — Node Type Definitions sauber aktivieren

- Add `@types/node` als **devDependency** (Version passend zu Node 20.x; deterministisch via `package-lock.json`).
- In TypeScript sicherstellen, dass Node-Typen genutzt werden (typisch via `compilerOptions.types: ["node"]` oder Standard-Resolution).

### Step 2 — Build-Scope explizit machen (src vs tests)

Entscheidungspunkt (explizit!):

- **Option A (empfohlen)**: Build kompiliert **nur** `src/**`.
  - `tsconfig.build.json` (oder Anpassung `tsconfig.json`) mit `include: ["src/**/*.ts"]`.
  - Optional separates `tsconfig.test.json` für `tests/**` (falls gewünscht), ohne dass es den Produkt-Build blockiert.
  - `npm run build` muss explizit auf das Build-TSConfig zeigen.

- **Option B**: Build kompiliert `src + tests`.
  - Dann müssen alle Test-Typfehler behoben werden (u.a. `@ts-expect-error`-Drift).

### Step 3 — Strict-Parameter-Typen in runtime fixen (ohne Semantikänderung)

- In `src/runtime/index.ts` und `src/runtime/persistence/filesystem.ts`:
  - Event-Handler-Parameter typisieren (z.B. `err: unknown`, `hadError: boolean`, `reason: unknown`).
  - Keine Logikänderung, nur Type-Annotationen.

### Step 4 — AuditEvent-Typing fixen (String-Literal erhalten)

- `auditBase(...)` so typisieren, dass `type` **nicht** zu `string` widenet:
  - z.B. generisch `auditBase<TType extends AuditEvent["type"]>(..., type: TType, ...)` und Rückgabewert mit `type: TType`.
  - Oder callsites mit `as const` / `satisfies`, falls passend.
- Ziel: `DecisionEvaluatedEvent`/etc. sollen ohne Casts/any korrekt typisieren.

## Risiken / Stolpersteine

- Wenn wir Option A (Build ohne Tests) wählen, muss das als **bewusste Grenze** dokumentiert werden (Produkt-Build ≠ Test-Typcheck).
- Wenn wir Option B wählen, kann das zu zusätzlichem Fix-Aufwand in `tests/**` führen (ohne Produktwert).
- Node-Version: lokale Abweichungen (z.B. Node 25) dürfen nicht zur stillen Inkompatibilität führen; Referenz ist Node **20.x** (package.json + Dockerfile).

## Empfohlene Umsetzung (Commit-Struktur)

Für Auditierbarkeit in kleinen, klaren Schritten:

1. `chore(build): add Node 20 typings for TypeScript` (nur `@types/node` + tsconfig wiring)
2. `chore(build): separate build tsconfig from tests` (nur TSConfig + build-script Ziel)
3. `chore(types): fix strict typings in runtime (noImplicitAny)` (nur Type-Annotationen)
4. `chore(types): preserve audit event literal types` (auditBase Typing)

## Out of Scope

- CI/Infra-Änderungen (Workflows, Registry, Deployment, Docker/Compose)
- Funktionale Änderungen an Runtime-Verhalten
- Änderungen an `src/core/**`

