# Documentation

This prototype is built in phases. These files track what each phase delivers and what waits for later.

| File | What it holds |
| --- | --- |
| [data-register.md](data-register.md) | Every piece of vendor data the screens collect or show: where it appears, whether the current shop has it, which phase needs it |
| [deferred.md](deferred.md) | Features and behaviour left out on purpose, and the phase they belong to |
| [decisions/](decisions/) | Decisions that are hard to undo, one file each |

## Rules

- **Data register.** When you add, remove or stop using vendor data (an application field, a vendor panel
  field, an admin section field), update `data-register.md` in the same change.
- **Deferred.** When you leave a feature or behaviour out on purpose, add a row to `deferred.md`.
- **Code markers.** Mark deferred spots in code with `// LATER(P<n>): ...`. Each marker needs a row in
  `deferred.md` or the data register. Find them with `grep -rn "LATER(P" apps/`.
- **Decisions.** A decision that is hard to undo (data shape, module boundary, provider, "not migrating X")
  gets a file in `decisions/`, copied from [0000-template.md](decisions/0000-template.md).
- **The current shop.** Never mark anything as present in the current shop unless someone has checked it.
  Write `to check` instead.
