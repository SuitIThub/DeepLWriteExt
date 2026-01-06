# Changelog

All notable changes to the DeepL Write Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-06

### Added
- **Pattern Management Sidebar**: New sidebar panel in the Explorer view for managing regex patterns
  - Visual list of all patterns with checkboxes to enable/disable them
  - Direct edit and delete buttons for each pattern
  - Add Pattern button in the view title
  - Patterns can be toggled on/off via checkboxes without opening dialogs
- **Pattern Enable/Disable Feature**: Patterns now have an `enabled` property that can be toggled via checkboxes
  - Only enabled patterns are used when improving text
  - Checkbox state is automatically saved when toggled
- **Improved Pattern Management UX**: 
  - Edit button directly opens the edit dialog (no intermediate popup)
  - Delete button shows confirmation and deletes directly
  - Status bar menu includes option to open patterns sidebar

### Changed
- Pattern management moved from popup dialogs to a dedicated sidebar view
- `applyPatterns()` function now filters to only use enabled patterns
- Pattern editing preserves the enabled state

## [1.0.3] - 2025-12-22

### Fixed
- Correction of README concerning regex pattern matching

## [1.0.2] - 2025-12-21

### Fixed
- Fixed notification dismissal when accepting/rejecting changes via status bar buttons
- Improved pattern matching to only apply first matching pattern per text segment (prevents overlapping matches)
- Enhanced language mode preservation in diff view

## [1.0.1] - 2025-12-21

### Added
- Added extension icon

## [1.0.0] - 2025-12-21

### Added
- Initial release
- Text improvement with DeepL Write API
- Context menu and keyboard shortcut support
- Status bar configuration menu
- Writing style and tone support
- Regex pattern support for selective text improvement
- Multiline text support
- Accept/Reject buttons in diff view
- Inline diff comparison

[1.1.0]: https://github.com/SuitIThub/DeepLWriteExt/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/SuitIThub/DeepLWriteExt/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/SuitIThub/DeepLWriteExt/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/SuitIThub/DeepLWriteExt/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/SuitIThub/DeepLWriteExt/releases/tag/v1.0.0

