# Publishing Guide for DeepL Write Extension

This guide will walk you through publishing your extension to the Visual Studio Code Marketplace.

## Prerequisites

1. **Microsoft Account**: You need a Microsoft account (or Azure DevOps account)
2. **Publisher Account**: Create a publisher ID on the Visual Studio Marketplace

## Step 1: Create a Publisher Account

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Click **"Create Publisher"** (if you don't have one yet)
4. Fill in the publisher details:
   - **Publisher ID**: Choose a unique ID (e.g., `yourname` or `yourcompany`)
   - **Publisher Name**: Your display name
   - **Email**: Your email address
   - **Description**: Brief description of your publisher account
5. Accept the Marketplace Publisher Agreement
6. Click **"Create"**

## Step 2: Update package.json

1. Open `package.json`
2. Replace `"publisher": "your-publisher-id"` with your actual publisher ID from Step 1
3. Optionally add more metadata:
   - `"repository"`: GitHub repository URL (if applicable)
   - `"homepage"`: Extension homepage URL
   - `"bugs"`: Issues URL
   - `"keywords"`: Array of keywords for search

Example:
```json
{
  "publisher": "your-publisher-id",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/DeepLWriteExt.git"
  },
  "homepage": "https://github.com/yourusername/DeepLWriteExt",
  "bugs": {
    "url": "https://github.com/yourusername/DeepLWriteExt/issues"
  },
  "keywords": [
    "deepl",
    "write",
    "grammar",
    "spelling",
    "text-improvement",
    "writing"
  ]
}
```

## Step 3: Install vsce (Visual Studio Code Extensions)

Install the `vsce` command-line tool globally:

```bash
npm install -g @vscode/vsce
```

Or use npx (no global installation needed):
```bash
npx @vscode/vsce package
```

## Step 4: Get a Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com)
2. Sign in with your Microsoft account
3. Click on your profile picture (top right) → **"Security"**
4. Click **"Personal access tokens"** → **"New Token"**
5. Configure the token:
   - **Name**: e.g., "VSCode Extension Publishing"
   - **Organization**: Select "All accessible organizations"
   - **Expiration**: Choose an expiration date (or "Custom defined")
   - **Scopes**: Select **"Marketplace"** → **"Manage"**
6. Click **"Create"**
7. **Copy the token immediately** (you won't be able to see it again!)

## Step 5: Compile and Package the Extension

1. Make sure your code is compiled:
   ```bash
   npm run compile
   ```

2. Package the extension (creates a `.vsix` file):
   ```bash
   npm run package
   ```
   
   Or using npx:
   ```bash
   npx @vscode/vsce package
   ```

   This will create a file like: `deepl-write-extension-1.0.0.vsix`

3. **Test the package locally** (optional but recommended):
   - In VSCode, go to Extensions view
   - Click the `...` menu → **"Install from VSIX..."**
   - Select your `.vsix` file
   - Test that everything works

## Step 6: Publish to Marketplace

### Option A: Using vsce publish (Recommended)

1. Login to the marketplace:
   ```bash
   npx @vscode/vsce login <your-publisher-id>
   ```
   
   When prompted, enter your Personal Access Token from Step 4.

2. Publish the extension:
   ```bash
   npm run publish
   ```
   
   Or:
   ```bash
   npx @vscode/vsce publish
   ```

### Option B: Using the Web Interface

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Click **"New extension"** → **"Visual Studio Code"**
4. Upload your `.vsix` file
5. Fill in the extension details:
   - **Icon**: Upload a 128x128 PNG icon (optional but recommended)
   - **Categories**: Select relevant categories
   - **Tags**: Add relevant tags
6. Click **"Save"** and then **"Publish"**

## Step 7: Verify Publication

1. Wait a few minutes for the extension to be processed
2. Visit your extension page:
   ```
   https://marketplace.visualstudio.com/items?itemName=<publisher-id>.<extension-name>
   ```
   Example: `https://marketplace.visualstudio.com/items?itemName=your-publisher-id.deepl-write-extension`

3. Search for your extension in VSCode's Extensions view

## Updating Your Extension

When you want to publish an update:

1. Update the version in `package.json` (e.g., `1.0.0` → `1.0.1`)
2. Compile: `npm run compile`
3. Package: `npm run package`
4. Publish: `npm run publish` (or `npx @vscode/vsce publish`)

## Important Notes

- **Publisher ID**: 
  - Once set, it cannot be changed easily. Choose carefully!
  - Safe to include in your repository (it becomes public when published)
  - Appears in the marketplace URL: `marketplace.visualstudio.com/items?itemName=<publisher-id>.<extension-name>`
- **Personal Access Token**: 
  - **NEVER commit this to your repository!**
  - Store it securely (use environment variables or secure storage)
  - If accidentally committed, revoke it immediately and create a new one
- **Version**: Always increment the version number for updates
- **Testing**: Always test your extension thoroughly before publishing
- **README**: The README.md will be displayed on the marketplace page
- **License**: Make sure LICENSE file is included
- **Privacy**: If your extension collects data, you may need a privacy policy

## Troubleshooting

### "Publisher not found" error
- Make sure you've created a publisher account on the marketplace
- Verify the publisher ID in `package.json` matches your marketplace publisher ID

### "Invalid Personal Access Token"
- Generate a new token with "Marketplace" → "Manage" scope
- Make sure the token hasn't expired

### Extension not appearing after publishing
- Wait 5-10 minutes for processing
- Check the marketplace manage page for any errors
- Verify all required fields are filled

## Additional Resources

- [Publishing Extensions Documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce CLI Documentation](https://github.com/microsoft/vscode-vsce)
- [Marketplace Publisher Agreement](https://marketplace.visualstudio.com/terms)

