# Contributing

Thank you for your interest in contributing to `browser-thumbnail-generator`!

## Getting Started

```bash
# Clone the repository
git clone https://github.com/abhishekjnvk/browser-thumbnail-generator.git
cd browser-thumbnail-generator

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck

# Format code
npm run format
```

## Project Structure

```
src/              TypeScript source
  index.ts        Main entry point with input validation
  types.ts        Type definitions (ThumbnailOptions, ThumbnailResult)
  const.ts        Supported MIME type constants
  utils.ts        Dimension resolution, canvas helpers
  exif.ts         EXIF orientation parser
  image-thumbnail.ts   Image thumbnail generation
  video-thumbnail.ts   Video thumbnail generation
test/             Vitest test suite
  setup.ts        Browser API mocks (Canvas, Image, Video, etc.)
example/          React demo app
dist/             Build output (generated, do not edit)
```

## Development Workflow

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** in `src/`. Add tests in `test/`.

3. **Run the checks** before committing:
   ```bash
   npm run typecheck
   npm run lint
   npm run format
   npm test
   npm run build
   ```

4. **Commit** with a descriptive message:
   ```bash
   git commit -m "feat: add my feature"
   ```

5. **Push** and open a **Pull Request**.

## Code Style

- TypeScript with strict mode enabled
- Prettier for formatting (2-space indent, double quotes, semicolons)
- ESLint with `@typescript-eslint` recommended rules
- JSDoc comments on all exported functions

## Testing Guidelines

- All new features must include tests
- Tests use Vitest with jsdom environment
- Browser APIs (Canvas, Image, Video, `createImageBitmap`) are mocked in `test/setup.ts`
- Aim for descriptive test names: `should <expected behavior> when <condition>`

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
refactor: code refactoring
test: add or update tests
docs: documentation changes
chore: maintenance tasks
```

## Reporting Issues

- Use [GitHub Issues](https://github.com/abhishekjnvk/browser-thumbnail-generator/issues)
- Include browser version, library version, and reproduction steps
- For bugs, include a minimal reproduction (code snippet or file)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
