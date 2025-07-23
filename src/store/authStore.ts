import { create } from 'zustand';
import { account, databases, DATABASE_ID, COLLECTIONS, ID } from '../services/AppwriteService';
import { Models } from 'appwrite';

export interface UserStats {
  $id?: string;
  user_id: string;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  current_streak: number;
  best_streak: number;
}

export interface GameRecord {
  $id?: string;
  player_id: string;
  opponent_type: string;
  result: 'win' | 'lose' | 'draw';
  game_duration?: number;
  moves_count?: number;
  played_at: string;
}

interface AuthState {
  user: Models.User<any> | null;
  userStats: UserStats | null;
  gameRecords: GameRecord[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // 认证方法
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  
  // 数据管理
  loadUserStats: () => Promise<void>;
  loadGameRecords: () => Promise<void>;
  saveGameResult: (gameRecord: Omit<GameRecord, '$id' | 'player_id' | 'played_at'>) => Promise<void>;
  updateUserStats: (result: 'win' | 'lose' | 'draw') => Promise<void>;
  
  // 初始化
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userStats: null,
  gameRecords: [],
  isLoading: false,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await account.get();
      set({ user, isAuthenticated: true });
      
      // 加载用户数据
      await get().loadUserStats();
      await get().loadGameRecords();
    } catch (error) {
      console.log('用户未登录或会话已过期');
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      set({ user, isAuthenticated: true });
      
      // 加载用户数据
      await get().loadUserStats();
      await get().loadGameRecords();
    } catch (error: any) {
      console.error('登录失败:', error);
      throw new Error(error.message || '登录失败');
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true });
    try {
      // 创建账户
      const user = await account.create(ID.unique(), email, password, name);
      
      // 自动登录
      await account.createEmailPasswordSession(email, password);
      const sessionUser = await account.get();
      
      // 创建初始用户统计
      const initialStats: Omit<UserStats, '$id'> = {
        user_id: sessionUser.$id,
        total_games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        current_streak: 0,
        best_streak: 0,
      };
      
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_STATS,
        ID.unique(),
        initialStats
      );
      
      set({ user: sessionUser, isAuthenticated: true });
      
      // 加载用户数据
      await get().loadUserStats();
      await get().loadGameRecords();
    } catch (error: any) {
      console.error('注册失败:', error);
      throw new Error(error.message || '注册失败');
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await account.deleteSession('current');
      set({
        user: null,
        userStats: null,
        gameRecords: [],
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('登出失败:', error);
    }
  },

  loadUserStats: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_STATS,
        [`equal("user_id", "${user.$id}")`]
      );
      
      if (response.documents.length > 0) {
        set({ userStats: response.documents[0] as unknown as UserStats });
      }
    } catch (error) {
      console.error('加载用户统计失败:', error);
    }
  },

  loadGameRecords: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.GAME_RECORDS,
        [
          `equal("player_id", "${user.$id}")`,
          `orderDesc("played_at")`,
          `limit(50)`
        ]
      );
      
      set({ gameRecords: response.documents as unknown as GameRecord[] });
    } catch (error) {
      console.error('加载游戏记录失败:', error);
    }
  },

  saveGameResult: async (gameRecord: Omit<GameRecord, '$id' | 'player_id' | 'played_at'>) => {
    const { user } = get();
    if (!user) return;
    
    try {
      const record: Omit<GameRecord, '$id'> = {
        ...gameRecord,
        player_id: user.$id,
        played_at: new Date().toISOString(),
      };
      
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.GAME_RECORDS,
        ID.unique(),
        record
      );
      
      // 更新用户统计
      await get().updateUserStats(gameRecord.result);
      
      // 重新加载记录
      await get().loadGameRecords();
    } catch (error) {
      console.error('保存游戏记录失败:', error);
    }
  },

  updateUserStats: async (result: 'win' | 'lose' | 'draw') => {
    const { user, userStats } = get();
    if (!user || !userStats) return;
    
    try {
      const newStats = { ...userStats };
      newStats.total_games += 1;
      
      if (result === 'win') {
        newStats.wins += 1;
        newStats.current_streak += 1;
        newStats.best_streak = Math.max(newStats.best_streak, newStats.current_streak);
      } else if (result === 'lose') {
        newStats.losses += 1;
        newStats.current_streak = 0;
      } else {
        newStats.draws += 1;
        newStats.current_streak = 0;
      }
      
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USER_STATS,
        userStats.$id!,
        {
          total_games: newStats.total_games,
          wins: newStats.wins,
          losses: newStats.losses,
          draws: newStats.draws,
          current_streak: newStats.current_streak,
          best_streak: newStats.best_streak,
        }
      );
      
      set({ userStats: newStats });
    } catch (error) {
      console.error('更新用户统计失败:', error);
    }
  },
}));
