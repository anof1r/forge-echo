# Forge Echo - agent rules

## Language and characters
- Write everything in English: code, comments, tests, docs, commit messages.
- ASCII only. No non-ASCII characters in any file.

## Development process
- TDD: write a failing test first, make it pass, then refactor.
- Tests use the AAA layout with `// Arrange`, `// Act`, `// Assert` comments.

## Coupling with Battle Forge (read-only)
- Forge Echo never writes to Battle Forge: no REST writes, no Mongo access, no shared DB.
- The only message sent to Battle Forge is `data:subscribe`.
- All Battle Forge data goes through the strict parsers in `server/src/battle-forge/battle-forge.contract.ts`. Malformed data is dropped, never thrown.
- Contract changes must be covered by the live test: `npm run test:contract` in `server/` with `BATTLE_FORGE_URL` set.
- Forge Echo keeps its own data (tracks, bindings) keyed by slide id.

## Commands
- Client: `npm test`, `npm run build`.
- Server (in `server/`): `npm test`, `npm run typecheck`, `npm run build`.
