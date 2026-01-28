# MIMIC Monorepo

This monorepo contains the following packages:

- **apps/vscode-mimic**: VS Code extension that learns from your workflow
- **apps/opencode-plugin-mimic**: OpenCode plugin that adapts to your patterns

## Release Please

This repository uses [Release Please](https://github.com/googleapis/release-please) for automated versioning and releases.

### Conventional Commits

Use conventional commit messages to trigger version bumps:

- `feat:` - Minor version bump (new features)
- `fix:` - Patch version bump (bug fixes)
- `feat!:` or `BREAKING CHANGE:` - Major version bump

### Tags

- VS Code Extension: `vscode-mimic@v1.0.0`
- OpenCode Plugin: `opencode-plugin-mimic@v0.1.11`
