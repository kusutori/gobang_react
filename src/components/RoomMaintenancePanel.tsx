import React, { useState } from 'react';
import { onlineGameService } from '../services/OnlineGameService';

interface RoomMaintenancePanelProps {
    onClose: () => void;
}

export const RoomMaintenancePanel: React.FC<RoomMaintenancePanelProps> = ({ onClose }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<string[]>([]);

    const addResult = (message: string) => {
        setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const handleCleanupZombieRooms = async () => {
        setIsLoading(true);
        try {
            const count = await onlineGameService.cleanupZombieRooms(30);
            addResult(`清理僵尸房间完成，删除了 ${count} 个房间`);
        } catch (error: any) {
            addResult(`清理僵尸房间失败: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCleanupExpiredRooms = async () => {
        setIsLoading(true);
        try {
            const count = await onlineGameService.cleanupExpiredRooms(2);
            addResult(`清理过期房间完成，删除了 ${count} 个房间`);
        } catch (error: any) {
            addResult(`清理过期房间失败: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForceCleanupAll = async () => {
        if (!window.confirm('⚠️ 警告：这将删除所有房间，确定要继续吗？')) {
            return;
        }
        
        setIsLoading(true);
        try {
            const count = await onlineGameService.forceCleanupAllRooms();
            addResult(`强制清理所有房间完成，删除了 ${count} 个房间`);
        } catch (error: any) {
            addResult(`强制清理失败: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const clearResults = () => {
        setResults([]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">房间维护面板</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-3 mb-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleCleanupZombieRooms}
                            disabled={isLoading}
                            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50 flex-1 min-w-max"
                        >
                            清理僵尸房间
                        </button>
                        <button
                            onClick={handleCleanupExpiredRooms}
                            disabled={isLoading}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 flex-1 min-w-max"
                        >
                            清理过期房间
                        </button>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={handleForceCleanupAll}
                            disabled={isLoading}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 flex-1"
                        >
                            ⚠️ 强制清理所有房间
                        </button>
                        <button
                            onClick={clearResults}
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                        >
                            清空日志
                        </button>
                    </div>
                </div>

                <div className="flex-1 bg-gray-100 rounded p-3 overflow-y-auto">
                    <h3 className="font-semibold mb-2">操作日志：</h3>
                    {results.length === 0 ? (
                        <p className="text-gray-500 text-sm">暂无操作记录</p>
                    ) : (
                        <div className="space-y-1">
                            {results.map((result, index) => (
                                <div key={index} className="text-sm text-gray-700 font-mono">
                                    {result}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    <p><strong>说明：</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>僵尸房间：游戏中状态但30分钟内无活动的房间</li>
                        <li>过期房间：2小时内无更新的所有房间</li>
                        <li>强制清理：删除所有房间（仅用于调试）</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
