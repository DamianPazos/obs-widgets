# Guía de contribución

¡Gracias por querer aportar! 🎉

## Empezar

```bash
pnpm install
pnpm dev
```

## Antes de un PR

Asegurate de que pase todo:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Convenciones

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`…). Husky valida el formato.
- **Formato**: Prettier corre en el pre-commit (lint-staged).
- **TypeScript estricto**: nada de `any` sin justificación.

## Agregar un widget

Seguí [docs/adding-a-widget.md](docs/adding-a-widget.md). Los widgets se
auto-registran; no toques el `registry`.

## Estructura

Mirá [docs/architecture.md](docs/architecture.md) para entender las capas y la
regla de dependencias antes de mover código entre paquetes.

## Reportar bugs / pedir features

Usá las [plantillas de issues](.github/ISSUE_TEMPLATE). Para ideas de widgets
hay una plantilla dedicada.
