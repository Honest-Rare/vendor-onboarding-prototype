# Working in this repo

This project is built in phases. The docs in `docs/` track what each phase delivers and what is waiting for later.
Read [docs/README.md](docs/README.md) for the rules. In short:

- When you add, remove or stop using vendor data (a migration column, a section field, an application field),
  update [docs/data-register.md](docs/data-register.md) in the same change.
- When you leave a feature or behaviour out on purpose, add a row to [docs/deferred.md](docs/deferred.md).
- Mark deferred spots in code with `// LATER(P<n>): ...`, and make sure each one has a row in the register or in `deferred.md`.
- A decision that is hard to undo (schema shape, module boundary, provider, "not migrating X") gets a file in
  `docs/decisions/`, copied from `0000-template.md`.
- Never mark anything as present in the current shop unless that has been checked. Use `to check`.
