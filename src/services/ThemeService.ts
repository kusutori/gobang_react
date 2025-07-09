export interface BoardTheme {
    id: string;
    name: string;
    backgroundColor: number;
    gridColor: number;
    starColor: number;
    boardBorderColor: string;
    boardBackgroundClass: string;
    uiBackgroundClass: string;
    description: string;
    icon: string;
}

export const boardThemes: BoardTheme[] = [
    {
        id: 'classic',
        name: '经典木纹',
        backgroundColor: 0xD2B48C,
        gridColor: 0x8B4513,
        starColor: 0x654321,
        boardBorderColor: 'border-amber-800',
        boardBackgroundClass: 'bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100',
        uiBackgroundClass: 'bg-white/80 backdrop-blur-sm border-amber-200',
        description: '传统的木质棋盘风格',
        icon: '🪵'
    },
    {
        id: 'modern',
        name: '现代深色',
        backgroundColor: 0x2D3748,
        gridColor: 0x4A5568,
        starColor: 0x718096,
        boardBorderColor: 'border-gray-700',
        boardBackgroundClass: 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900',
        uiBackgroundClass: 'bg-gray-800/90 backdrop-blur-sm border-gray-600',
        description: '现代简约深色主题',
        icon: '🌙'
    },
    {
        id: 'jade',
        name: '翡翠绿',
        backgroundColor: 0x065F46,
        gridColor: 0x047857,
        starColor: 0x10B981,
        boardBorderColor: 'border-emerald-700',
        boardBackgroundClass: 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50',
        uiBackgroundClass: 'bg-emerald-100/80 backdrop-blur-sm border-emerald-300',
        description: '清新的翡翠绿主题',
        icon: '🍃'
    },
    {
        id: 'ocean',
        name: '海洋蓝',
        backgroundColor: 0x0F4C75,
        gridColor: 0x3282B8,
        starColor: 0xBBE1FA,
        boardBorderColor: 'border-blue-700',
        boardBackgroundClass: 'bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50',
        uiBackgroundClass: 'bg-blue-100/80 backdrop-blur-sm border-blue-300',
        description: '深邃的海洋蓝主题',
        icon: '🌊'
    },
    {
        id: 'sunset',
        name: '日落橙',
        backgroundColor: 0xC2410C,
        gridColor: 0xEA580C,
        starColor: 0xFB923C,
        boardBorderColor: 'border-orange-700',
        boardBackgroundClass: 'bg-gradient-to-br from-orange-50 via-red-50 to-pink-50',
        uiBackgroundClass: 'bg-orange-100/80 backdrop-blur-sm border-orange-300',
        description: '温暖的日落橙主题',
        icon: '🌅'
    },
    {
        id: 'purple',
        name: '紫罗兰',
        backgroundColor: 0x6B46C1,
        gridColor: 0x8B5CF6,
        starColor: 0xA78BFA,
        boardBorderColor: 'border-purple-700',
        boardBackgroundClass: 'bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50',
        uiBackgroundClass: 'bg-purple-100/80 backdrop-blur-sm border-purple-300',
        description: '优雅的紫罗兰主题',
        icon: '🔮'
    }
];

export class ThemeService {
    private static instance: ThemeService;
    private currentTheme: BoardTheme = boardThemes[0];
    private listeners: ((theme: BoardTheme) => void)[] = [];

    public static getInstance(): ThemeService {
        if (!ThemeService.instance) {
            ThemeService.instance = new ThemeService();
        }
        return ThemeService.instance;
    }

    constructor() {
        // 从localStorage加载主题
        const savedThemeId = localStorage.getItem('gobang_theme');
        if (savedThemeId) {
            const theme = boardThemes.find(t => t.id === savedThemeId);
            if (theme) {
                this.currentTheme = theme;
            }
        }
    }

    public getCurrentTheme(): BoardTheme {
        return this.currentTheme;
    }

    public setTheme(themeId: string): void {
        const theme = boardThemes.find(t => t.id === themeId);
        if (theme) {
            this.currentTheme = theme;
            localStorage.setItem('gobang_theme', themeId);
            this.notifyListeners();
        }
    }

    public addListener(listener: (theme: BoardTheme) => void): void {
        this.listeners.push(listener);
    }

    public removeListener(listener: (theme: BoardTheme) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener(this.currentTheme));
    }
}

export const themeService = ThemeService.getInstance();
