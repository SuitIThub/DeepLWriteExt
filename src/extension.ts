import * as vscode from 'vscode';
import axios from 'axios';

const CONFIG_API_KEY = 'deeplWrite.apiKey';
const CONFIG_TARGET_LANGUAGE = 'deeplWrite.targetLanguage';
const CONFIG_WRITING_STYLE = 'deeplWrite.writingStyle';
const CONFIG_TONE = 'deeplWrite.tone';
const CONFIG_PATTERNS = 'deeplWrite.patterns';
const DEEPL_API_URL = 'https://api.deepl.com/v2/write/rephrase';
const DEEPL_API_FREE_URL = 'https://api-free.deepl.com/v2/write/rephrase';
const DEEPL_WRITE_SCHEME = 'deepl-write';

// Languages that support writing_style and tone
// Source: https://developers.deepl.com/api-reference/improve-text
const STYLE_TONE_SUPPORTED_LANGUAGES = ['DE', 'EN-GB', 'EN-US'];

// Supported languages for DeepL Write API (text improvement)
// Source: https://developers.deepl.com/docs/getting-started/supported-languages
interface LanguageOption {
    label: string;
    value: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
    { label: 'German', value: 'DE' },
    { label: 'English (British)', value: 'EN-GB' },
    { label: 'English (American)', value: 'EN-US' },
    { label: 'Spanish', value: 'ES' },
    { label: 'French', value: 'FR' },
    { label: 'Italian', value: 'IT' },
    { label: 'Portuguese (Brazilian)', value: 'PT-BR' },
    { label: 'Portuguese', value: 'PT-PT' }
];

// Writing styles for DeepL Write API
// Source: https://developers.deepl.com/api-reference/improve-text
interface StyleOption {
    label: string;
    value: string;
    description?: string;
}

const WRITING_STYLES: StyleOption[] = [
    { label: 'Default', value: 'default', description: 'No specific style (default behavior)' },
    { label: 'Simple', value: 'simple', description: 'Simple and clear writing' },
    { label: 'Business', value: 'business', description: 'Professional business writing' },
    { label: 'Academic', value: 'academic', description: 'Formal academic writing' },
    { label: 'Casual', value: 'casual', description: 'Casual, informal writing' },
    { label: 'Prefer Simple', value: 'prefer_simple', description: 'Prefer simple, fallback to default if not supported' },
    { label: 'Prefer Business', value: 'prefer_business', description: 'Prefer business, fallback to default if not supported' },
    { label: 'Prefer Academic', value: 'prefer_academic', description: 'Prefer academic, fallback to default if not supported' },
    { label: 'Prefer Casual', value: 'prefer_casual', description: 'Prefer casual, fallback to default if not supported' }
];

const TONES: StyleOption[] = [
    { label: 'Default', value: 'default', description: 'No specific tone (default behavior)' },
    { label: 'Enthusiastic', value: 'enthusiastic', description: 'Energetic and enthusiastic tone' },
    { label: 'Friendly', value: 'friendly', description: 'Warm and friendly tone' },
    { label: 'Confident', value: 'confident', description: 'Assertive and confident tone' },
    { label: 'Diplomatic', value: 'diplomatic', description: 'Tactful and diplomatic tone' },
    { label: 'Prefer Enthusiastic', value: 'prefer_enthusiastic', description: 'Prefer enthusiastic, fallback to default if not supported' },
    { label: 'Prefer Friendly', value: 'prefer_friendly', description: 'Prefer friendly, fallback to default if not supported' },
    { label: 'Prefer Confident', value: 'prefer_confident', description: 'Prefer confident, fallback to default if not supported' },
    { label: 'Prefer Diplomatic', value: 'prefer_diplomatic', description: 'Prefer diplomatic, fallback to default if not supported' }
];

interface DeepLResponse {
    improvements: Array<{
        text: string;
        detected_source_language: string;
        target_language: string;
    }>;
}

// Regex pattern configuration
interface RegexPattern {
    name: string;
    pattern: string;
    captureGroupName: string;
    description?: string;
}

// Match information for pattern-based improvement
interface PatternMatch {
    fullMatch: string;
    captureGroupContent: string;
    startIndex: number;
    endIndex: number;
    captureGroupStart: number;
    captureGroupEnd: number;
    patternName: string;
}

// TextDocumentContentProvider for inline diff comparison
class ImprovedTextProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private improvedTexts = new Map<string, string>();
    private documentLanguages = new Map<string, string>();

    provideTextDocumentContent(uri: vscode.Uri): string {
        const key = uri.path;
        return this.improvedTexts.get(key) || '';
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    updateImprovedText(uri: vscode.Uri, content: string, languageId?: string) {
        const key = uri.path;
        this.improvedTexts.set(key, content);
        if (languageId) {
            this.documentLanguages.set(key, languageId);
        }
        this._onDidChange.fire(uri);
    }

    getDocumentLanguage(uri: vscode.Uri): string | undefined {
        const key = uri.path;
        return this.documentLanguages.get(key);
    }

    clearImprovedText(uri: vscode.Uri) {
        const key = uri.path;
        this.improvedTexts.delete(key);
        this.documentLanguages.delete(key);
    }
}

// Store improvement context for accept/reject actions
interface ImprovementContext {
    originalUri: vscode.Uri;
    originalRange: vscode.Range;
    improvedText: string;
    improvedUri: vscode.Uri;
}

let currentImprovementContext: ImprovementContext | null = null;
let activeNotification: Thenable<string | undefined> | null = null;
let notificationHandled = false;

export function activate(context: vscode.ExtensionContext) {
    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('DeepL Write');
    context.subscriptions.push(outputChannel);

    // Register text document content provider for inline diff
    const improvedTextProvider = new ImprovedTextProvider();
    const providerRegistration = vscode.workspace.registerTextDocumentContentProvider(
        DEEPL_WRITE_SCHEME,
        improvedTextProvider
    );
    context.subscriptions.push(providerRegistration);

    // Create main status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(pencil) DeepL Write";
    statusBarItem.tooltip = "DeepL Write - Click to configure";
    statusBarItem.command = 'deeplWrite.showMenu';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Create accept/reject status bar items (hidden by default)
    const acceptStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200);
    acceptStatusBarItem.text = "$(check) Accept";
    acceptStatusBarItem.tooltip = "Accept the improved text";
    acceptStatusBarItem.command = 'deeplWrite.acceptChanges';
    acceptStatusBarItem.color = '#4EC9B0';
    context.subscriptions.push(acceptStatusBarItem);

    const rejectStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 199);
    rejectStatusBarItem.text = "$(close) Reject";
    rejectStatusBarItem.tooltip = "Reject the improved text";
    rejectStatusBarItem.command = 'deeplWrite.rejectChanges';
    rejectStatusBarItem.color = '#F48771';
    context.subscriptions.push(rejectStatusBarItem);

    // Function to update accept/reject button visibility
    const updateAcceptRejectButtons = () => {
        if (currentImprovementContext) {
            acceptStatusBarItem.show();
            rejectStatusBarItem.show();
        } else {
            acceptStatusBarItem.hide();
            rejectStatusBarItem.hide();
        }
    };

    // Register code action provider for accept/reject actions in diff editor
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        { scheme: '*' },
        {
            provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
                if (!currentImprovementContext) {
                    return [];
                }

                // Only show in diff editor (when comparing with improved document)
                const actions: vscode.CodeAction[] = [];

                // Accept action
                const acceptAction = new vscode.CodeAction('✓ Accept Changes', vscode.CodeActionKind.QuickFix);
                acceptAction.command = {
                    command: 'deeplWrite.acceptChanges',
                    title: 'Accept Changes'
                };
                acceptAction.isPreferred = true;
                actions.push(acceptAction);

                // Reject action
                const rejectAction = new vscode.CodeAction('✗ Reject Changes', vscode.CodeActionKind.QuickFix);
                rejectAction.command = {
                    command: 'deeplWrite.rejectChanges',
                    title: 'Reject Changes'
                };
                actions.push(rejectAction);

                return actions;
            }
        },
        {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
        }
    );
    context.subscriptions.push(codeActionProvider);

    // Register show menu command
    const showMenuCommand = vscode.commands.registerCommand('deeplWrite.showMenu', async () => {
        const apiKey = getApiKey();
        const language = getTargetLanguage();
        const writingStyle = getWritingStyle();
        const tone = getTone();
        const patterns = getPatterns();
        const styleToneSupported = language ? isStyleToneSupported(language) : false;
        
        const items: vscode.QuickPickItem[] = [
            {
                label: '$(key) Set API Key',
                description: apiKey ? 'Currently set' : 'Not set',
                detail: apiKey ? `Key: ${apiKey.substring(0, 8)}...` : 'Click to set your DeepL API key'
            },
            {
                label: '$(globe) Set Language',
                description: language || 'Not set',
                detail: language ? `Current: ${language}` : 'Click to set target language'
            },
            {
                label: '$(edit) Set Writing Style',
                description: writingStyle || 'Not set',
                detail: styleToneSupported 
                    ? (writingStyle ? `Current: ${writingStyle}` : 'Click to set writing style (DE, EN-GB, EN-US only)')
                    : 'Not available (set language to DE, EN-GB, or EN-US first)'
            },
            {
                label: '$(megaphone) Set Tone',
                description: tone || 'Not set',
                detail: styleToneSupported
                    ? (tone ? `Current: ${tone}` : 'Click to set tone (DE, EN-GB, EN-US only)')
                    : 'Not available (set language to DE, EN-GB, or EN-US first)'
            },
            {
                label: '$(regex) Manage Regex Patterns',
                description: patterns.length > 0 ? `${patterns.length} pattern(s) configured` : 'No patterns configured',
                detail: 'Configure regex patterns to improve only specific parts of text'
            },
            {
                label: '$(keyboard) Change Keyboard Shortcut',
                description: 'Open keyboard shortcuts editor',
                detail: 'Customize the keyboard shortcut for improving text'
            },
            {
                label: '$(refresh) Improve Selected Text',
                description: 'Improve the currently selected text',
                detail: 'Uses DeepL Write API to improve your text'
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'DeepL Write Options'
        });

        if (!selected) {
            return;
        }

        if (selected.label.includes('API Key')) {
            await vscode.commands.executeCommand('deeplWrite.setApiKey');
        } else if (selected.label.includes('Language')) {
            await vscode.commands.executeCommand('deeplWrite.setLanguage');
        } else if (selected.label.includes('Writing Style')) {
            await vscode.commands.executeCommand('deeplWrite.setWritingStyle');
        } else if (selected.label.includes('Tone')) {
            await vscode.commands.executeCommand('deeplWrite.setTone');
        } else if (selected.label.includes('Regex Patterns')) {
            await vscode.commands.executeCommand('deeplWrite.managePatterns');
        } else if (selected.label.includes('Keyboard Shortcut')) {
            await vscode.commands.executeCommand('deeplWrite.openKeyboardShortcuts');
        } else if (selected.label.includes('Improve')) {
            await vscode.commands.executeCommand('deeplWrite.improveText');
        }
    });
    context.subscriptions.push(showMenuCommand);

    // Register set API key command
    const setApiKeyCommand = vscode.commands.registerCommand('deeplWrite.setApiKey', async () => {
        const currentKey = getApiKey();
        const input = await vscode.window.showInputBox({
            prompt: 'Enter your DeepL API Key',
            password: true,
            value: currentKey,
            placeHolder: 'Your DeepL API authentication key',
            ignoreFocusOut: true
        });

        if (input !== undefined) {
            await vscode.workspace.getConfiguration().update(CONFIG_API_KEY, input, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('DeepL API key saved successfully');
        }
    });
    context.subscriptions.push(setApiKeyCommand);

    // Register set writing style command
    const setWritingStyleCommand = vscode.commands.registerCommand('deeplWrite.setWritingStyle', async () => {
        const currentLanguage = getTargetLanguage();
        if (!currentLanguage || !isStyleToneSupported(currentLanguage)) {
            const setLang = await vscode.window.showWarningMessage(
                'Writing style is only available for German (DE), English (British) (EN-GB), or English (American) (EN-US). Please set your language first.',
                'Set Language'
            );
            if (setLang === 'Set Language') {
                await vscode.commands.executeCommand('deeplWrite.setLanguage');
            }
            return;
        }

        const currentStyle = getWritingStyle();
        const selected = await vscode.window.showQuickPick(
            WRITING_STYLES.map(style => ({
                label: style.label,
                description: style.description,
                detail: style.value === currentStyle ? 'Currently selected' : undefined
            })),
            {
                placeHolder: 'Select writing style',
                canPickMany: false
            }
        );

        if (selected) {
            const styleValue = WRITING_STYLES.find(s => s.label === selected.label)?.value || '';
            await vscode.workspace.getConfiguration().update(CONFIG_WRITING_STYLE, styleValue, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Writing style set to ${selected.label}`);
        }
    });
    context.subscriptions.push(setWritingStyleCommand);

    // Register set tone command
    const setToneCommand = vscode.commands.registerCommand('deeplWrite.setTone', async () => {
        const currentLanguage = getTargetLanguage();
        if (!currentLanguage || !isStyleToneSupported(currentLanguage)) {
            const setLang = await vscode.window.showWarningMessage(
                'Tone is only available for German (DE), English (British) (EN-GB), or English (American) (EN-US). Please set your language first.',
                'Set Language'
            );
            if (setLang === 'Set Language') {
                await vscode.commands.executeCommand('deeplWrite.setLanguage');
            }
            return;
        }

        const currentTone = getTone();
        const selected = await vscode.window.showQuickPick(
            TONES.map(tone => ({
                label: tone.label,
                description: tone.description,
                detail: tone.value === currentTone ? 'Currently selected' : undefined
            })),
            {
                placeHolder: 'Select tone',
                canPickMany: false
            }
        );

        if (selected) {
            const toneValue = TONES.find(t => t.label === selected.label)?.value || '';
            await vscode.workspace.getConfiguration().update(CONFIG_TONE, toneValue, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Tone set to ${selected.label}`);
        }
    });
    context.subscriptions.push(setToneCommand);

    // Register manage patterns command
    const managePatternsCommand = vscode.commands.registerCommand('deeplWrite.managePatterns', async () => {
        const patterns = getPatterns();
        
        const items: vscode.QuickPickItem[] = [
            {
                label: '$(add) Add Pattern',
                description: 'Add a new regex pattern',
                detail: 'Create a new pattern with a named capture group'
            },
            ...patterns.map((pattern, index) => ({
                label: `$(edit) ${pattern.name || `Pattern ${index + 1}`}`,
                description: pattern.description || pattern.pattern.substring(0, 50),
                detail: `Group: ${pattern.captureGroupName} | Pattern: ${pattern.pattern.substring(0, 30)}...`
            })),
            ...(patterns.length > 0 ? [{
                label: '$(trash) Clear All Patterns',
                description: 'Remove all configured patterns',
                detail: 'This will delete all regex patterns'
            }] : [])
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Manage Regex Patterns'
        });

        if (!selected) {
            return;
        }

        if (selected.label.includes('Add Pattern')) {
            await addPattern(context);
        } else if (selected.label.includes('Clear All')) {
            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to delete all patterns?',
                { modal: true },
                'Yes',
                'No'
            );
            if (confirm === 'Yes') {
                await setPatterns([]);
                vscode.window.showInformationMessage('All patterns cleared');
            }
        } else {
            // Edit or delete pattern
            const patternIndex = items.indexOf(selected) - 1; // Subtract 1 for "Add Pattern" item
            if (patternIndex >= 0 && patternIndex < patterns.length) {
                await editPattern(context, patterns[patternIndex], patternIndex);
            }
        }
    });
    context.subscriptions.push(managePatternsCommand);

    // Register open keyboard shortcuts command
    const openKeyboardShortcutsCommand = vscode.commands.registerCommand('deeplWrite.openKeyboardShortcuts', async () => {
        // Open keyboard shortcuts editor
        await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings');
        // Show a helpful message after a short delay to let the editor open
        setTimeout(() => {
            vscode.window.showInformationMessage('Search for "deeplWrite.improveText" or "Improve Text with DeepL Write" to change the keyboard shortcut');
        }, 500);
    });
    context.subscriptions.push(openKeyboardShortcutsCommand);

    // Register set language command
    const setLanguageCommand = vscode.commands.registerCommand('deeplWrite.setLanguage', async () => {
        const currentLanguage = getTargetLanguage();
        const selected = await vscode.window.showQuickPick(SUPPORTED_LANGUAGES, {
            placeHolder: 'Select target language for text improvement',
            canPickMany: false
        });

        if (selected) {
            await vscode.workspace.getConfiguration().update(CONFIG_TARGET_LANGUAGE, selected.value, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Target language set to ${selected.label}`);
        }
    });
    context.subscriptions.push(setLanguageCommand);

    // Register accept changes command
    const acceptChangesCommand = vscode.commands.registerCommand('deeplWrite.acceptChanges', async () => {
        if (!currentImprovementContext) {
            vscode.window.showWarningMessage('No improvement changes to accept');
            return;
        }

        // Mark notification as handled and try to close it
        notificationHandled = true;
        if (activeNotification) {
            try {
                await vscode.commands.executeCommand('workbench.action.closeMessages');
            } catch (e) {
                // Command might not be available, ignore
            }
            activeNotification = null;
        }

        const context = currentImprovementContext;
        const originalDoc = await vscode.workspace.openTextDocument(context.originalUri);
        
        // Apply the changes
        const edit = new vscode.WorkspaceEdit();
        edit.replace(context.originalUri, context.originalRange, context.improvedText);
        const success = await vscode.workspace.applyEdit(edit);
        
        if (success) {
            // Switch back to original document
            await vscode.window.showTextDocument(originalDoc);
            // Small delay to ensure the previous notification is dismissed
            setTimeout(() => {
                vscode.window.showInformationMessage('Text improved successfully!');
            }, 150);
            // Clean up
            improvedTextProvider.clearImprovedText(context.improvedUri);
            currentImprovementContext = null;
            updateAcceptRejectButtons();
        } else {
            vscode.window.showErrorMessage('Failed to apply changes');
        }
    });
    context.subscriptions.push(acceptChangesCommand);

    // Register reject changes command
    const rejectChangesCommand = vscode.commands.registerCommand('deeplWrite.rejectChanges', async () => {
        if (!currentImprovementContext) {
            vscode.window.showWarningMessage('No improvement changes to reject');
            return;
        }

        // Mark notification as handled and try to close it
        notificationHandled = true;
        if (activeNotification) {
            try {
                await vscode.commands.executeCommand('workbench.action.closeMessages');
            } catch (e) {
                // Command might not be available, ignore
            }
            activeNotification = null;
        }

        const context = currentImprovementContext;
        const originalDoc = await vscode.workspace.openTextDocument(context.originalUri);
        
        // Switch back to original document
        await vscode.window.showTextDocument(originalDoc);
        // Small delay to ensure the previous notification is dismissed
        setTimeout(() => {
            vscode.window.showInformationMessage('Changes rejected');
        }, 150);
        
        // Clean up
        improvedTextProvider.clearImprovedText(context.improvedUri);
        currentImprovementContext = null;
        updateAcceptRejectButtons();
    });
    context.subscriptions.push(rejectChangesCommand);

    // Register improve text command
    const improveTextCommand = vscode.commands.registerCommand('deeplWrite.improveText', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('Please select some text to improve');
            return;
        }

                let selectedText = editor.document.getText(selection);
                if (!selectedText.trim()) {
                    vscode.window.showWarningMessage('Selected text is empty');
                    return;
                }

                // Check for regex patterns and extract matches
                const patterns = getPatterns();
                let patternMatches: PatternMatch[] = [];
                let textToImprove = selectedText;
                let usePatterns = false;

                if (patterns.length > 0) {
                    patternMatches = applyPatterns(selectedText, patterns, outputChannel);
                    if (patternMatches.length > 0) {
                        usePatterns = true;
                        // Extract only the capture group contents for improvement
                        textToImprove = patternMatches.map(m => m.captureGroupContent).join('\n');
                        if (outputChannel) {
                            outputChannel.show(true);
                        }
                    }
                }

                // Store pattern info for later use (needs to be accessible in the progress callback)
                const patternInfo = { matches: patternMatches, usePatterns: usePatterns, originalText: selectedText };

                // Split text into lines to preserve multiline structure
                // Each line will be sent as a separate string in the array to the API
                const textLines = textToImprove.split(/\r?\n/);

        // Check API key
        let apiKey = getApiKey();
        if (!apiKey) {
            const setKey = await vscode.window.showWarningMessage(
                'DeepL API key is not set. Please set it first.',
                'Set API Key'
            );
            if (setKey === 'Set API Key') {
                await vscode.commands.executeCommand('deeplWrite.setApiKey');
            }
            return;
        }

        // Check language
        let targetLanguage = getTargetLanguage();
        if (!targetLanguage) {
            const selected = await vscode.window.showQuickPick(SUPPORTED_LANGUAGES, {
                placeHolder: 'Select target language for text improvement',
                canPickMany: false
            });

            if (!selected) {
                return;
            }

            targetLanguage = selected.value;
            await vscode.workspace.getConfiguration().update(CONFIG_TARGET_LANGUAGE, targetLanguage, vscode.ConfigurationTarget.Global);
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Improving text with DeepL Write...",
            cancellable: false
        }, async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
            try {
                // Determine API URL based on API key (free keys end with :fx)
                const apiUrl = apiKey.endsWith(':fx') ? DEEPL_API_FREE_URL : DEEPL_API_URL;

                // Build request body
                // Convert language code to lowercase as per API documentation
                const requestBody: any = {
                    text: textLines,
                    target_lang: targetLanguage.toLowerCase()
                };

                // Add writing_style or tone if supported and configured
                // Note: Only one of writing_style or tone can be used, not both
                const writingStyle = getWritingStyle();
                const tone = getTone();
                
                if (isStyleToneSupported(targetLanguage)) {
                    if (tone && tone !== 'default' && tone !== '') {
                        requestBody.tone = tone;
                    } else if (writingStyle && writingStyle !== 'default' && writingStyle !== '') {
                        requestBody.writing_style = writingStyle;
                    }
                }

                const response = await axios.post<DeepLResponse>(
                    apiUrl,
                    requestBody,
                    {
                        headers: {
                            'Authorization': `DeepL-Auth-Key ${apiKey}`,
                            'Content-Type': 'application/json',
                            'User-Agent': 'DeepLWriteExtension/1.0.2'
                        }
                    }
                );

                if (response.data.improvements && response.data.improvements.length > 0) {
                    // Combine improved lines back together, preserving line breaks
                    // The API returns an array of improvements, one for each input line
                    const improvedLines = response.data.improvements.map(imp => imp.text);
                    
                    let improvedText: string;
                    if (patternInfo.usePatterns && patternInfo.matches.length > 0) {
                        // Replace capture group contents with improved text in original text
                        improvedText = replacePatternMatches(patternInfo.originalText, patternInfo.matches, improvedLines);
                    } else {
                        // Join the improved lines back together with newlines
                        // This preserves the original multiline structure
                        improvedText = improvedLines.join('\n');
                    }
                    const originalDoc = editor.document;
                    const originalRange = new vscode.Range(selection.start, selection.end);
                    
                    // Create a document with the improved text in place for inline diff comparison
                    const fullDocumentText = originalDoc.getText();
                    const beforeSelection = fullDocumentText.substring(0, originalDoc.offsetAt(selection.start));
                    const afterSelection = fullDocumentText.substring(originalDoc.offsetAt(selection.end));
                    const improvedDocumentText = beforeSelection + improvedText + afterSelection;
                    
                    // Create virtual document URI for improved text
                    const fileName = originalDoc.fileName.split(/[/\\]/).pop() || 'document';
                    const improvedUri = vscode.Uri.parse(
                        `${DEEPL_WRITE_SCHEME}:${fileName}.improved`
                    );
                    
                    // Update the content provider with improved text, preserving the original language
                    const originalLanguageId = originalDoc.languageId;
                    improvedTextProvider.updateImprovedText(improvedUri, improvedDocumentText, originalLanguageId);
                    
                    // Open the improved document
                    const improvedDoc = await vscode.workspace.openTextDocument(improvedUri);
                    
                    // Set the language mode to match the original document
                    if (originalLanguageId) {
                        await vscode.languages.setTextDocumentLanguage(improvedDoc, originalLanguageId);
                    }
                    
                    // Store improvement context for accept/reject commands
                    currentImprovementContext = {
                        originalUri: originalDoc.uri,
                        originalRange: originalRange,
                        improvedText: improvedText,
                        improvedUri: improvedUri
                    };

                    // Show accept/reject buttons in status bar
                    updateAcceptRejectButtons();

                    // Show inline diff view - VSCode will use inline mode if user has it enabled
                    // The diff editor will automatically show inline changes when comparing similar content
                    // Users can toggle between inline and side-by-side view using the diff editor's view options
                    await vscode.commands.executeCommand(
                        'vscode.diff',
                        originalDoc.uri,
                        improvedUri,
                        `${fileName} (Original ↔ Improved)`
                    );
                    
                    // Set the language mode for the improved document to match the original
                    // This needs to be done after the diff view is opened
                    setTimeout(async () => {
                        const visibleEditors = vscode.window.visibleTextEditors;
                        for (const visibleEditor of visibleEditors) {
                            if (visibleEditor.document.uri.toString() === improvedUri.toString()) {
                                const storedLanguageId = improvedTextProvider.getDocumentLanguage(improvedUri);
                                if (storedLanguageId && storedLanguageId !== visibleEditor.document.languageId) {
                                    await vscode.languages.setTextDocumentLanguage(visibleEditor.document, storedLanguageId);
                                }
                                break;
                            }
                        }
                    }, 100);

                    // Show a prominent notification with action buttons that appears immediately
                    // This notification is non-blocking and stays visible
                    activeNotification = vscode.window.showInformationMessage(
                        '✓ Text improved! Review the diff and click below to accept or reject:',
                        { modal: false },
                        '✓ Accept Changes',
                        '✗ Reject Changes'
                    );
                    notificationHandled = false;
                    activeNotification.then(action => {
                        // Only handle if not already handled via status bar
                        if (!notificationHandled && action) {
                            if (action === '✓ Accept Changes') {
                                vscode.commands.executeCommand('deeplWrite.acceptChanges');
                            } else if (action === '✗ Reject Changes') {
                                vscode.commands.executeCommand('deeplWrite.rejectChanges');
                            }
                        }
                        activeNotification = null;
                        notificationHandled = false;
                    });

                    // Also add a visible indicator in the diff editor after it opens
                    setTimeout(async () => {
                        // Try to find the diff editor and add visual indicators
                        const visibleEditors = vscode.window.visibleTextEditors;
                        for (const visibleEditor of visibleEditors) {
                            if (visibleEditor.document.uri.toString() === improvedUri.toString()) {
                                // Add a decoration at the top of the document showing instructions
                                addTopDecoration(visibleEditor, context);
                                break;
                            }
                        }
                    }, 800);
                } else {
                    vscode.window.showErrorMessage('No improvements returned from DeepL API');
                }
            } catch (error: any) {
                let errorMessage = 'Failed to improve text';
                if (axios.isAxiosError(error)) {
                    if (error.response) {
                        errorMessage = `DeepL API Error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;
                    } else if (error.request) {
                        errorMessage = 'Failed to connect to DeepL API. Please check your internet connection.';
                    }
                } else if (error instanceof Error) {
                    errorMessage = error.message;
                }
                vscode.window.showErrorMessage(errorMessage);
            }
        });
    });
    context.subscriptions.push(improveTextCommand);
}

function addTopDecoration(editor: vscode.TextEditor, context: vscode.ExtensionContext) {
    if (!currentImprovementContext) {
        return;
    }

    // Create a decoration type that shows instructions at the top
    const instructionDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '💡 Use the notification above or press Ctrl+. (Cmd+. on Mac) for Accept/Reject options',
            color: '#4EC9B0',
            fontWeight: 'normal',
            backgroundColor: 'rgba(78, 201, 176, 0.1)'
        },
        rangeBehavior: vscode.DecorationRangeBehavior.OpenOpen,
        isWholeLine: true
    });

    // Add decoration at the first line
    const firstLine = editor.document.lineAt(0);
    const firstLineRange = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(0, firstLine.text.length)
    );

    editor.setDecorations(instructionDecorationType, [firstLineRange]);

    // Clean up after 10 seconds or when context is cleared
    setTimeout(() => {
        instructionDecorationType.dispose();
    }, 10000);

    context.subscriptions.push(instructionDecorationType);
}

function getApiKey(): string {
    return vscode.workspace.getConfiguration().get<string>(CONFIG_API_KEY, '');
}

function getTargetLanguage(): string {
    return vscode.workspace.getConfiguration().get<string>(CONFIG_TARGET_LANGUAGE, '');
}

function getWritingStyle(): string {
    return vscode.workspace.getConfiguration().get<string>(CONFIG_WRITING_STYLE, '');
}

function getTone(): string {
    return vscode.workspace.getConfiguration().get<string>(CONFIG_TONE, '');
}

function isStyleToneSupported(language: string): boolean {
    return STYLE_TONE_SUPPORTED_LANGUAGES.includes(language.toUpperCase());
}

function getPatterns(): RegexPattern[] {
    const patterns = vscode.workspace.getConfiguration().get<RegexPattern[]>(CONFIG_PATTERNS, []);
    return patterns;
}

function setPatterns(patterns: RegexPattern[]): Thenable<void> {
    return vscode.workspace.getConfiguration().update(CONFIG_PATTERNS, patterns, vscode.ConfigurationTarget.Global);
}

/**
 * Checks if two ranges overlap
 */
function rangesOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
    return start1 < end2 && start2 < end1;
}

/**
 * Applies regex patterns to text and extracts matches with named capture groups
 * Only the first matching pattern for each piece of text is applied (no overlaps)
 */
function applyPatterns(text: string, patterns: RegexPattern[], outputChannel?: vscode.OutputChannel): PatternMatch[] {
    const matches: PatternMatch[] = [];
    // Track which parts of the text have already been matched (by capture group positions)
    const matchedRanges: Array<{ start: number; end: number }> = [];
    
    // Check patterns in order - first pattern that matches takes precedence
    for (const patternConfig of patterns) {
        try {
            const regex = new RegExp(patternConfig.pattern, 'g');
            let match;
            
            while ((match = regex.exec(text)) !== null) {
                // Check if the named capture group exists
                if (match.groups && match.groups[patternConfig.captureGroupName]) {
                    const captureGroupContent = match.groups[patternConfig.captureGroupName];
                    const fullMatch = match[0];
                    const matchStart = match.index;
                    const matchEnd = matchStart + fullMatch.length;
                    
                    // Find the position of the capture group within the full match
                    const captureGroupIndex = match[0].indexOf(captureGroupContent);
                    const captureGroupStart = matchStart + captureGroupIndex;
                    const captureGroupEnd = captureGroupStart + captureGroupContent.length;
                    
                    // Check if this capture group overlaps with any already matched region
                    const overlaps = matchedRanges.some(range => 
                        rangesOverlap(captureGroupStart, captureGroupEnd, range.start, range.end)
                    );
                    
                    // Only add if it doesn't overlap with existing matches
                    if (!overlaps) {
                        matches.push({
                            fullMatch: fullMatch,
                            captureGroupContent: captureGroupContent,
                            startIndex: matchStart,
                            endIndex: matchEnd,
                            captureGroupStart: captureGroupStart,
                            captureGroupEnd: captureGroupEnd,
                            patternName: patternConfig.name
                        });
                        
                        // Mark this region as matched
                        matchedRanges.push({ start: captureGroupStart, end: captureGroupEnd });
                    }
                }
            }
        } catch (error) {
            // Invalid regex pattern - skip it
            const errorMsg = `Invalid regex pattern "${patternConfig.pattern}" in pattern "${patternConfig.name}": ${error}`;
            console.error(errorMsg);
            if (outputChannel) {
                outputChannel.appendLine(`ERROR: ${errorMsg}`);
            }
        }
    }
    
    // Log summary only if matches found or errors occurred
    if (outputChannel && (matches.length > 0 || patterns.length > 0)) {
        if (matches.length > 0) {
            outputChannel.appendLine(`Pattern matching: ${matches.length} match(es) found`);
            matches.forEach((match, index) => {
                outputChannel.appendLine(`  ${index + 1}. "${match.patternName}": "${match.captureGroupContent}"`);
            });
        } else if (patterns.length > 0) {
            outputChannel.appendLine(`Pattern matching: No matches found (${patterns.length} pattern(s) checked)`);
        }
    }
    
    // Sort matches by start index to process them in order
    return matches.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Replaces capture group content in original text with improved content
 */
function replacePatternMatches(originalText: string, matches: PatternMatch[], improvedTexts: string[]): string {
    if (matches.length === 0) {
        return originalText;
    }
    
    // Process matches in reverse order to maintain correct indices
    let result = originalText;
    for (let i = matches.length - 1; i >= 0; i--) {
        const match = matches[i];
        const improvedText = improvedTexts[i];
        
        // Replace the capture group content with improved text
        const before = result.substring(0, match.captureGroupStart);
        const after = result.substring(match.captureGroupEnd);
        result = before + improvedText + after;
    }
    
    return result;
}

async function addPattern(context: vscode.ExtensionContext) {
    const name = await vscode.window.showInputBox({
        prompt: 'Enter a name for this pattern',
        placeHolder: 'e.g., Single Quotes',
        ignoreFocusOut: true
    });

    if (!name) {
        return;
    }

    const pattern = await vscode.window.showInputBox({
        prompt: 'Enter the regex pattern (must include a named capture group like (?<text>...))',
        placeHolder: 'e.g., character \'(?<text>[^\']*)\'',
        ignoreFocusOut: true
    });

    if (!pattern) {
        return;
    }

    // Validate regex
    try {
        new RegExp(pattern);
    } catch (error) {
        vscode.window.showErrorMessage(`Invalid regex pattern: ${error}`);
        return;
    }

    const captureGroupName = await vscode.window.showInputBox({
        prompt: 'Enter the name of the capture group to extract',
        placeHolder: 'e.g., text',
        ignoreFocusOut: true
    });

    if (!captureGroupName) {
        return;
    }

    const description = await vscode.window.showInputBox({
        prompt: 'Enter a description (optional)',
        placeHolder: 'e.g., Extracts text from single quotes after "character"',
        ignoreFocusOut: true
    });

    const patterns = getPatterns();
    patterns.push({
        name: name,
        pattern: pattern,
        captureGroupName: captureGroupName,
        description: description
    });

    await setPatterns(patterns);
    vscode.window.showInformationMessage(`Pattern "${name}" added successfully`);
}

async function editPattern(context: vscode.ExtensionContext, pattern: RegexPattern, index: number) {
    const actions = ['Edit', 'Delete', 'Cancel'];
    const action = await vscode.window.showQuickPick(actions, {
        placeHolder: `What would you like to do with "${pattern.name}"?`
    });

    if (!action || action === 'Cancel') {
        return;
    }

    if (action === 'Delete') {
        const patterns = getPatterns();
        patterns.splice(index, 1);
        await setPatterns(patterns);
        vscode.window.showInformationMessage(`Pattern "${pattern.name}" deleted`);
    } else if (action === 'Edit') {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter a name for this pattern',
            value: pattern.name,
            ignoreFocusOut: true
        });

        if (!name) {
            return;
        }

        const patternStr = await vscode.window.showInputBox({
            prompt: 'Enter the regex pattern',
            value: pattern.pattern,
            ignoreFocusOut: true
        });

        if (!patternStr) {
            return;
        }

        // Validate regex
        try {
            new RegExp(patternStr);
        } catch (error) {
            vscode.window.showErrorMessage(`Invalid regex pattern: ${error}`);
            return;
        }

        const captureGroupName = await vscode.window.showInputBox({
            prompt: 'Enter the name of the capture group',
            value: pattern.captureGroupName,
            ignoreFocusOut: true
        });

        if (!captureGroupName) {
            return;
        }

        const description = await vscode.window.showInputBox({
            prompt: 'Enter a description (optional)',
            value: pattern.description || '',
            ignoreFocusOut: true
        });

        const patterns = getPatterns();
        patterns[index] = {
            name: name,
            pattern: patternStr,
            captureGroupName: captureGroupName,
            description: description
        };

        await setPatterns(patterns);
        vscode.window.showInformationMessage(`Pattern "${name}" updated`);
    }
}

export function deactivate() {}

