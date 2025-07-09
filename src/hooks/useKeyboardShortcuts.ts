import { useEffect } from 'react';

interface KeyboardShortcut {
    key: string;
    action: () => void;
    description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // 忽略输入框中的按键
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            const shortcut = shortcuts.find(s => s.key === event.key.toLowerCase());
            if (shortcut) {
                event.preventDefault();
                shortcut.action();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [shortcuts]);
};

// 全局快捷键定义
export const globalShortcuts = {
    SETTINGS: 's',
    GUIDE: 'h',
    FULLSCREEN: 'f',
    RESET: 'r',
    ESCAPE: 'escape'
};
