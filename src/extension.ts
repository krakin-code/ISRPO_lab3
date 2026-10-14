import * as vscode from 'vscode';

/**
 * Результат анализа кода
 */
export interface AnalysisResult {
    /** Максимальная глубина вложенности скобок */
    maxDepth: number;
    /** Цикломатическая сложность */
    cyclomaticComplexity: number;
    /** Оценка сложности (Низкая / Средняя / Высокая) */
    grade: string;
}

/**
 * Активация плагина при вызове команды в VS Code
 */
export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('code-complexity-analyzer.analyze', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Откройте файл с кодом');
            return;
        }

        // Берем выделенный кусок или весь файл
        const selection = editor.selection;
        let text = editor.document.getText(selection);
        if (!text || text.trim().length === 0) {
            text = editor.document.getText();
        }

        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('Файл пуст или текст не выделен');
            return;
        }

        const result = analyzeCode(text);

        const message = [
            `Вложенность: ${result.maxDepth}`,
            `Сложность: ${result.cyclomaticComplexity}`,
            `Оценка: ${result.grade}`
        ].join('\n');

        vscode.window.showInformationMessage(message, { modal: true });
    });

    context.subscriptions.push(disposable);
}

/**
 * Анализирует переданный фрагмент кода:
 * считает вложенность через стек скобок и цикломатическую сложность по ключевым словам.
 * 
 * @param code Исходный код для анализа
 * @returns Метрики сложности
 */
export function analyzeCode(code: string): AnalysisResult {
    // Стек для скобок { }
    const bracketStack: string[] = [];
    let currentDepth = 0;
    let maxDepth = 0;

    // Убираем строки в кавычках, чтобы скобки внутри строк не считались
    const sanitizedCode = code.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '');

    for (let i = 0; i < sanitizedCode.length; i++) {
        const char = sanitizedCode[i];
        if (char === '{') {
            bracketStack.push('{');
            currentDepth = bracketStack.length;
            if (currentDepth > maxDepth) {
                maxDepth = currentDepth;
            }
        } else if (char === '}') {
            if (bracketStack.length > 0) {
                bracketStack.pop();
                currentDepth = bracketStack.length;
            }
        }
    }

    // Операторы ветвления для расчета сложности
    const branchingKeywords = new Set([
        'if', 'else if', 'for', 'while', 'case', 'catch', '&&', '||', '?'
    ]);

    let cyclomaticComplexity = 1;
    const tokenRegex = /\b(if|else if|for|while|case|catch)\b|(&&|\|\||\?)/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(sanitizedCode)) !== null) {
        if (branchingKeywords.has(match[0])) {
            cyclomaticComplexity++;
        }
    }

    // Итоговая оценка
    let grade = 'Низкая';
    if (maxDepth >= 4 || cyclomaticComplexity > 10) {
        grade = 'Высокая';
    } else if (maxDepth >= 3 || cyclomaticComplexity >= 4) {
        grade = 'Средняя';
    }

    return {
        maxDepth,
        cyclomaticComplexity,
        grade
    };
}

export function deactivate() {}