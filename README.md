# DeepL Write Extension for VSCode

![Version](https://img.shields.io/badge/version-1.0.2-blue.svg)
![VSCode](https://img.shields.io/badge/VSCode-%3E%3D1.74.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.4-blue.svg)

A VSCode extension that improves your text using the DeepL Write API. This extension helps you enhance your writing by fixing grammar, spelling, and improving overall text quality with advanced features like selective text improvement using regex patterns.

## Features

- **Text Improvement**: Select any text and improve it using DeepL Write API
- **Keyboard Shortcut**: Quick access via `Ctrl+Shift+W` (Windows/Linux) or `Cmd+Shift+W` (Mac) - customizable
- **Context Menu**: Right-click on selected text to access the improvement option
- **Easy Configuration**: Set your API key, target language, writing style, and tone via the status bar
- **Diff View**: Review changes using VSCode's built-in diff editor (inline or side-by-side) before applying
- **Accept/Reject Buttons**: Easy-to-use buttons directly in the diff view and status bar
- **Multiline Support**: Automatically handles multiline text selections while preserving structure
- **Writing Style & Tone**: Customize writing style (simple, business, academic, casual) and tone (enthusiastic, friendly, confident, diplomatic) for supported languages
- **Regex Pattern Support**: Configure regex patterns with named capture groups to improve only specific parts of text (e.g., code comments, quoted strings)

## Getting Started

### Prerequisites

- A DeepL API Pro account (Write API is only available for Pro subscriptions)
- Your DeepL API authentication key

You can create a Pro API account at [DeepL API](https://www.deepl.com/pro-api).

**Note**: DeepL Write API is currently only available for Pro API subscribers, not Free API accounts.

### Installation

1. Clone or download this repository
2. Open the folder in VSCode
3. Run `npm install` to install dependencies
4. Press `F5` to launch a new Extension Development Host window
5. In the new window, test the extension

### Configuration

1. **Set API Key**:
   - Click on the "DeepL Write" status bar item (bottom left)
   - Select "Set API Key"
   - Enter your DeepL API key

2. **Set Target Language**:
   - Click on the "DeepL Write" status bar item
   - Select "Set Language"
   - Choose your preferred language for text improvement

3. **Set Writing Style** (optional, for DE, EN-GB, EN-US only):
   - Click on the "DeepL Write" status bar item
   - Select "Set Writing Style"
   - Choose from: Default, Simple, Business, Academic, Casual, or Prefer variants

4. **Set Tone** (optional, for DE, EN-GB, EN-US only):
   - Click on the "DeepL Write" status bar item
   - Select "Set Tone"
   - Choose from: Default, Enthusiastic, Friendly, Confident, Diplomatic, or Prefer variants

5. **Configure Regex Patterns** (optional):
   - Click on the "DeepL Write" status bar item
   - Select "Manage Regex Patterns"
   - Add patterns to improve only specific parts of text (see [Regex Patterns](#regex-patterns) section)

6. **Customize Keyboard Shortcut**:
   - Click on the "DeepL Write" status bar item
   - Select "Change Keyboard Shortcut"
   - Search for "deeplWrite.improveText" and set your preferred shortcut

### Usage

1. **Select text** in any editor
2. **Improve text** using one of these methods:
   - Right-click and select "Improve Text with DeepL Write"
   - Press `Ctrl+Shift+W` (Windows/Linux) or `Cmd+Shift+W` (Mac) - default shortcut
   - Click the status bar item and select "Improve Selected Text"

3. **Review the diff** in the comparison view (inline or side-by-side, depending on your VSCode settings)
4. **Accept or reject changes**:
   - Click the notification buttons (✓ Accept Changes / ✗ Reject Changes)
   - Use code actions (Ctrl+. / Cmd+.) in the diff editor
   - Click the Accept/Reject buttons in the status bar (bottom right)

**Note**: To use inline diff view, enable "Diff Editor: Render Side By Side" setting in VSCode and toggle the inline view option in the diff editor toolbar.

## Supported Languages

The extension supports all languages supported by DeepL Write API ([source](https://developers.deepl.com/docs/getting-started/supported-languages)):
- **German** (DE)
- **English (British)** (EN-GB)
- **English (American)** (EN-US)
- **Spanish** (ES)
- **French** (FR)
- **Italian** (IT)
- **Portuguese (Brazilian)** (PT-BR)
- **Portuguese** (PT-PT)

### Writing Style & Tone Support

Writing styles and tones are only available for the following languages:
- German (DE)
- English (British) (EN-GB)
- English (American) (EN-US)

**Writing Styles:**
- `default` - No specific style (default behavior)
- `simple` - Simple and clear writing
- `business` - Professional business writing
- `academic` - Formal academic writing
- `casual` - Casual, informal writing
- `prefer_simple`, `prefer_business`, `prefer_academic`, `prefer_casual` - Prefer the style, fallback to default if not supported

**Tones:**
- `default` - No specific tone (default behavior)
- `enthusiastic` - Energetic and enthusiastic tone
- `friendly` - Warm and friendly tone
- `confident` - Assertive and confident tone
- `diplomatic` - Tactful and diplomatic tone
- `prefer_enthusiastic`, `prefer_friendly`, `prefer_confident`, `prefer_diplomatic` - Prefer the tone, fallback to default if not supported

**Note**: Only one of `writing_style` or `tone` can be used in a single request. If both are set, `tone` takes precedence.

## Regex Patterns

The extension supports regex patterns with named capture groups to improve only specific parts of text. This is useful for cases where you want to improve text within code syntax, comments, or quoted strings.

### Example Use Cases

1. **Code Comments**: Improve text in comments while preserving code syntax
   - Pattern: `//\s*(?<text>.*)`
   - Capture Group: `text`
   - Example: `// This is a comment that needs improvement` → Only "This is a comment that needs improvement" is improved

2. **Quoted Strings**: Improve text within quotes
   - Pattern: `character\s+'(?<text>[^']*)'`
   - Capture Group: `text`
   - Example: `character 'here is text that should be improved'` → Only "here is text that should be improved" is improved

3. **Markdown Links**: Improve link text
   - Pattern: `\[(?<text>[^\]]+)\]\([^\)]+\)`
   - Capture Group: `text`
   - Example: `[Click here](https://example.com)` → Only "Click here" is improved

### How to Configure Patterns

1. Click the "DeepL Write" status bar item
2. Select "Manage Regex Patterns"
3. Click "Add Pattern"
4. Enter:
   - **Name**: A descriptive name (e.g., "Single Quotes")
   - **Pattern**: The regex pattern with a named capture group (e.g., `character\s+'(?<text>[^\']*)'`)
   - **Capture Group Name**: The name of the capture group to extract (e.g., `text`)
   - **Description** (optional): A description of what the pattern does

### Pattern Requirements

- Patterns must use **named capture groups** in the format `(?<name>...)`
- The capture group name must match what you enter in "Capture Group Name"
- Patterns are tested in order, and all matches are processed
- If multiple patterns match the same text, the first match is applied

### Tips

- Test your regex patterns using an online regex tester before adding them
- Use `prefer_*` variants for writing styles/tones if you want fallback behavior
- Patterns are case-sensitive by default (use `(?i)` flag if needed, though JavaScript regex flags work differently)

## API Endpoints

- **Free API**: `https://api-free.deepl.com` (Write API not available)
- **Pro API**: `https://api.deepl.com` (Write API available)

The extension automatically detects whether you're using a free or Pro API key (free keys end with `:fx`). However, note that DeepL Write API is only available for Pro API subscriptions.

## Development

### Building

```bash
npm install
npm run compile
```

### Testing

Press `F5` in VSCode to launch the Extension Development Host and test the extension.

### Project Structure

- `src/extension.ts` - Main extension code
- `package.json` - Extension manifest and configuration
- `tsconfig.json` - TypeScript configuration
- `icon.png` - Extension icon (128x128 PNG)

## Troubleshooting

### Pattern Not Matching

If your regex pattern isn't matching:
1. Check the Output panel (View → Output, select "DeepL Write")
2. Verify your regex pattern syntax
3. Ensure the named capture group exists and matches the capture group name
4. Test your pattern with the actual text format (check for special characters, quotes, etc.)

### Writing Style/Tone Not Working

- Writing styles and tones are only supported for DE, EN-GB, and EN-US
- Ensure your target language is set to one of the supported languages
- Only one of `writing_style` or `tone` can be used (tone takes precedence if both are set)

### API Errors

- Verify your API key is correct and has Pro API access
- Check your API quota and limits
- Ensure you have an active internet connection
- Free API keys cannot access the Write API endpoint

## License

MIT

## Acknowledgments

- [DeepL API](https://developers.deepl.com/) for the text improvement API
- VSCode Extension API documentation

## Changelog

### Version 1.0.2
- Fixed notification dismissal when accepting/rejecting changes via status bar buttons
- Improved pattern matching to only apply first matching pattern per text segment (prevents overlapping matches)
- Enhanced language mode preservation in diff view

### Version 1.0.1
- Added extension icon

### Version 1.0.0
- Initial release
- Text improvement with DeepL Write API
- Context menu and keyboard shortcut support
- Status bar configuration menu
- Writing style and tone support
- Regex pattern support for selective text improvement
- Multiline text support
- Accept/Reject buttons in diff view
- Inline diff comparison
