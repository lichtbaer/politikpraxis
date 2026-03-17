# Test Coverage Analysis

Generated: 2026-03-17

## Current State Overview

| Area | Source Files | Test Files | Statement Coverage |
|------|-------------|------------|-------------------|
| Frontend core | ~30 TS modules | 17 test files | **39.71%** |
| Backend | 33 Python files | 2 test files | **Not measured** |

Overall frontend coverage: **39.71% statements, 27.91% branches, 41.08% functions, 43.15% lines**

---

## Frontend Coverage Breakdown

### Well-Tested Modules (>80% lines)

| Module | Lines | Notes |
|--------|-------|-------|
| `constants.ts` | 100% | Fully covered |
| `kongruenz.ts` | 100% | Excellent branch coverage (89%) |
| `wahlprognose.ts` | 100% | Election forecast logic solid |
| `milieus.ts` | 100% | Milieu system well tested |
| `features.ts` | 100% | Feature flags covered |
| `log.ts` | 100% | |
| `gesetzAgenda.ts` | 100% | Branch coverage could improve (68%) |
| `eventPause.ts` | 87.5% | Minor gap |
| `engine.ts` | 78.26% | Core engine mostly covered |

### Partially Tested Modules (20-80% lines)

| Module | Lines | Key Gaps |
|--------|-------|----------|
| `economy.ts` | 70.37% | Missing economic cycle edge cases |
| `gesetzLebenszyklus.ts` | 69.53% | Law lifecycle phases 368-376, 431-433 untested |
| `state.ts` | 66.43% | State initialization/reset paths uncovered (359-411) |
| `coalition.ts` | 100% stmt but 33% funcs | Only 1 of 3 functions tested |
| `verbaende.ts` | 53.16% | Association influence calculations gaps |
| `haushalt.ts` | 52.17% | Budget calculations 244-171, 235-312 missing |
| `wahlkampf.ts` | 51.92% | Campaign system 336-363, 397-406 untested |
| `parliament.ts` | 50% | Voting mechanics 322-328 missing |
| `eu.ts` | 46.66% | EU interaction paths 440-451, 466-469 |
| `medienklima.ts` | 46.78% | Media climate 289-298, 306-324 |
| `koalition.ts` | 44% | Coalition negotiation 241-336 untested |
| `election.ts` | 42.85% | Election resolution logic |
| `characters.ts` | 35.89% | Character mood/loyalty updates sparse |
| `ministerialInitiativen.ts` | 34.48% | Initiative resolution 123-192 |
| `ideologie.ts` | 32.14% | Ideology scoring 66-87, 108-153 |
| `levels.ts` | 32.25% | Level progression largely untested |
| `politikfeldDruck.ts` | 25% | Policy pressure system barely tested |

### Untested Modules (0% coverage)

| Module | Lines of Code | Description |
|--------|--------------|-------------|
| `validation.ts` | 78 lines | Input/state validation logic |
| `ausrichtung.ts` | 84 lines | Political alignment/orientation system |
| `bundesrat.ts` | 435 lines | **Bundesrat simulation (largest untested module)** |
| `ebeneActions.ts` | 96 lines | Government level action handlers |
| `media.ts` | 14 lines | Media system helpers |
| `procgen.ts` | 20 lines | Procedural generation |

### Frontend Modules Without Dedicated Test Files

These system modules have **no `.test.ts` file** at all:

- `ausrichtung.ts` - Political alignment system
- `bundesrat.ts` - Bundesrat simulation
- `characters.ts` - Character system
- `coalition.ts` - Coalition mechanics (different from `koalition.ts`)
- `ebeneActions.ts` - Level/government action handlers
- `economy.ts` - Economic simulation
- `election.ts` - Election resolution
- `features.ts` - Feature flags
- `levels.ts` - Level/difficulty progression
- `media.ts` - Media system
- `politikfeldDruck.ts` - Policy field pressure
- `procgen.ts` - Procedural content generation

---

## Backend Coverage Gaps

### Currently Tested
- **Admin API** (`test_admin_api.py`) - 9 endpoint tests (CRUD, auth, i18n)
- **Content API** (`test_content_api.py`) - 11 endpoint tests (read-only content)

### Completely Untested Routes

| Route Module | Endpoints | Risk |
|-------------|-----------|------|
| **`auth.py`** | `POST /register`, `POST /login`, `GET /me` | **Critical** - user authentication |
| **`saves.py`** | 5 CRUD endpoints for game saves | **High** - data persistence |
| **`analytics.py`** | `POST /batch`, `GET /summary` | Medium |
| **`mods.py`** | 4 endpoints (list, get, create, download) | Medium |

### Untested Service Layer

| Service | Key Functions | Risk |
|---------|--------------|------|
| `auth_service.py` | `hash_password`, `verify_password`, `create_access_token`, `decode_token` | **Critical** |
| `save_service.py` | `create_save`, `update_save`, `delete_save`, `get_user_saves` | **High** |
| `mod_validator.py` | `validate_mod_content` (field validation, type checking) | Medium |
| `analytics_service.py` | `record_events`, `get_summary` | Low |

---

## Recommended Improvements (Priority Order)

### Priority 1: Critical Security & Data Integrity

1. **Backend auth tests** (`test_auth_api.py`)
   - Registration with valid/invalid/duplicate data
   - Login success and failure paths
   - JWT token generation and validation
   - Password hashing verification
   - Protected endpoint access without/with expired tokens

2. **Backend save system tests** (`test_saves_api.py`)
   - CRUD operations for game saves
   - Authorization checks (users can only access own saves)
   - Invalid save data handling
   - Save size limits

### Priority 2: Core Game Logic with 0% Coverage

3. **`bundesrat.test.ts`** - 435 lines of untested Bundesrat simulation
   - Vote calculations, faction behavior, legislative process
   - This is the single largest untested module

4. **`ausrichtung.test.ts`** - Political alignment calculations
   - Alignment scoring, policy impact on orientation

5. **`ebeneActions.test.ts`** - Government level action handlers
   - Action execution, state mutations, prerequisite checks

6. **`validation.test.ts`** - State/input validation
   - All validation paths should be covered since they guard game integrity

### Priority 3: Improve Low-Coverage Systems

7. **Expand `events.test.ts`** - Currently at 9.7% line coverage
   - Event triggering conditions, effect application, cooldowns
   - This is the worst-covered module that has a test file

8. **Expand `characters.test.ts`** (new file) - 35.89% coverage
   - Character mood changes, loyalty mechanics, relationship effects

9. **Expand `koalition.test.ts`** - 44% coverage
   - Coalition negotiation paths (lines 241-336)
   - Coalition break scenarios

10. **Expand `politikfeldDruck.test.ts`** (new file) - 25% coverage
    - Policy pressure calculations, thresholds, cascading effects

### Priority 4: Improve Branch Coverage

11. **`gesetzAgenda.ts`** - 100% lines but only 68% branches
12. **`ideologie.ts`** - 32% lines, 10% branches (worst branch ratio)
13. **`engine.ts`** - 78% lines but 52% branches

### Priority 5: Infrastructure

14. **Backend coverage tooling** - Add `pytest-cov` to requirements and configure reporting
15. **Mod validation tests** - `validate_mod_content()` has many validation branches
16. **CI pipeline** - No CI/CD exists; adding automated test runs would prevent regressions

---

## Quick Wins

These would provide the most coverage improvement for the least effort:

| Action | Estimated Impact |
|--------|-----------------|
| Add `bundesrat.test.ts` | +435 lines covered, biggest single module |
| Add backend auth tests | Covers critical security path |
| Expand `events.test.ts` from 9.7% to ~50% | Large module, significant coverage gain |
| Add `validation.test.ts` | Small file (78 lines), easy to cover fully |
| Add `media.test.ts` + `procgen.test.ts` | Small files, trivial to reach 100% |
