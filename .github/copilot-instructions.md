# Copilot Instructions for Gobang React

## Architecture Overview

This is a modern full-stack Gobang (Five-in-a-Row) game built with React + TypeScript + Bun. The architecture follows a service-oriented pattern with clear separation of concerns:

- **Frontend**: React 19 + TypeScript + PixiJS (game rendering) + Zustand (state)
- **Backend**: Bun + Express + Socket.IO (real-time multiplayer) + Appwrite (cloud backend)
- **AI Integration**: Multiple AI engines including local minimax, YiXin engine, and LLM-based players
- **Services**: Modular service layer for audio, themes, networking, AI, and user management

## Key Components & Data Flow

### Authentication & User Management (`src/store/authStore.ts`)

- **Appwrite integration** for user authentication and data persistence
- **Zustand store** manages authentication state with auto-initialization
- **User stats**: Stored in Appwrite with automatic sync across devices
- **Game records**: Persistent storage of all game results with detailed metadata

### Game State Management (`src/store/gameStore.ts`)

- **Zustand store** manages all game state with type-safe actions
- **Board**: 15x15 grid using `CellState[][]` (0=empty, 1=black, 2=white)
- **Game modes**: `"human" | "ai" | "llm" | "yixin" | "advanced"`
- All AI interactions flow through the store's async actions

### Appwrite Backend (`src/services/AppwriteService.ts`)

- **Database**: `gobang_game_db` with collections for `game_records` and `user_stats`
- **Authentication**: Email/password with session management
- **Data sync**: Automatic sync between local storage and cloud when authenticated
- **Permissions**: Document-level security for user data isolation

### Rendering Engine (`src/components/GameBoard.tsx`)

- **PixiJS** handles high-performance game rendering (1000+ lines)
- Theme system dynamically updates colors via `ThemeService`
- Stone placement uses interactive PIXI containers with hover previews
- Canvas size calculation: `cellSize = clamp(containerSize/19, MIN_CELL_SIZE, MAX_CELL_SIZE)`

### AI Architecture (`src/game/ai/`)

- **AIPlayer.ts**: Local minimax with alpha-beta pruning
- **AdvancedAI.ts**: Network-based AI using HTTP endpoints
- **YiXinService.ts**: Integration with external YiXin engine via HTTP bridge
- **LLM integration**: Uses proxy server to bypass CORS for AI model APIs

- **AIPlayer.ts**: Local minimax with alpha-beta pruning
- **AdvancedAI.ts**: Network-based AI using HTTP endpoints
- **YiXinService.ts**: Integration with external YiXin engine via HTTP bridge
- **LLM integration**: Uses proxy server to bypass CORS for AI model APIs

### Service Layer Pattern

Each service follows singleton pattern with event-driven updates:

```typescript
// Services emit changes, components listen
themeService.addListener(handleThemeChange);
audioService.playSound("place-stone");
socketService.emit(SOCKET_EVENTS.MAKE_MOVE, { row, col });
```

## Development Workflows

### Build & Development

```bash
bun install              # Install dependencies (includes Appwrite SDK)
bun dev                  # Start dev server (hot reload)
bun run build           # Production build
bun run proxy           # Start LLM proxy server
```

### Appwrite Backend Setup

```bash
# MCP configuration in .vscode/mcp.json
# Appwrite credentials and project ID configured via environment variables
# Database: gobang_game_db with collections for user stats and game records
```

### Multi-Service Startup

Use `scripts/start-all-services.ps1` for complete environment:

- YiXin HTTP service (Python, port 5000)
- Backend server (port 3001)
- Frontend dev server (port 3000)
- LLM proxy (port 3100)
- Appwrite cloud backend (automatic connection)

### User Authentication Flow

```typescript
// Initialize on app start
await authStore.initialize();

// Login/Register workflow
await authStore.login(email, password);
await authStore.register(email, password, name);

// Game data automatically syncs to Appwrite when authenticated
```

### AI Testing

```bash
# Test YiXin bridge
scripts/test-yixin-api.bat

# Check all services
scripts/check-services.bat
```

## Project-Specific Patterns

### Authentication Integration

User management follows a hybrid approach:

```typescript
// Authenticated users: data stored in Appwrite
if (isAuthenticated) {
  await authStore.saveGameResult(gameRecord); // Auto-syncs to cloud
}
// Anonymous users: data stored locally
else {
  updateLocalStats(result); // localStorage backup
}
```

### Appwrite Data Models

```typescript
interface UserStats {
  user_id: string;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  current_streak: number;
  best_streak: number;
}

interface GameRecord {
  player_id: string;
  opponent_type: string; // 'ai', 'llm', 'yixin', 'human', 'advanced'
  result: "win" | "lose" | "draw";
  game_duration?: number;
  moves_count?: number;
  played_at: string;
}
```

### Theme System

Themes are objects with both PixiJS colors (hex numbers) and CSS classes:

```typescript
backgroundColor: 0xD2B48C,           // PixiJS hex color
boardBackgroundClass: 'bg-gradient-to-br from-amber-100'  // Tailwind CSS
```

Always update both when adding themes.

### Game Mode Switching

Mode changes trigger complete AI reconfiguration in `gameStore.setGameMode()`:

```typescript
// AI cleanup -> new AI instantiation -> board reset
aiPlayer?.destroy();
setAIPlayer(new AIPlayer(config));
```

### Socket Event Naming

All socket events use SCREAMING_SNAKE_CASE constants from `SOCKET_EVENTS`:

```typescript
// ❌ Don't use string literals
socket.emit("make-move", data);

// ✅ Use constants
socket.emit(SOCKET_EVENTS.MAKE_MOVE, data);
```

### Error Boundaries

All AI components wrapped in `<ErrorBoundary>` due to async AI operations and potential network failures.

## Integration Points

### Appwrite Cloud Backend

- **Authentication**: Email/password sessions with automatic initialization
- **Database**: Cloud-hosted with real-time sync capabilities
- **Collections**: `game_records` and `user_stats` with document-level permissions
- **MCP Integration**: Server configuration in `.vscode/mcp.json` for development

### External AI Engines

- **YiXin**: Requires Python bridge server (`external/YiXin-Wuziqi-API/`)
- **LLM Models**: Proxied through `server/llm-proxy.ts` to handle CORS
- **Advanced AI**: HTTP-based custom AI endpoints

### Audio System

Programmatically generated audio (no external files):

```typescript
// Background music uses chord progressions
audioService.playBackgroundMusic();

// Game sounds are synthesized
audioService.playSound("place-stone", { volume: 0.5 });
```

### State Persistence

- **Authenticated users**: All data synced to Appwrite cloud storage
- **Anonymous users**: Game statistics via localStorage with JSON serialization
- **Theme preferences**: localStorage via ThemeService
- **UI settings**: Individual localStorage keys (no central config)

## Critical Files for Understanding

- `src/store/authStore.ts` - Appwrite authentication and user data management
- `src/store/gameStore.ts` - Core game logic and state
- `src/services/AppwriteService.ts` - Cloud backend integration and configuration
- `src/components/GameBoard.tsx` - PixiJS rendering and interaction
- `src/components/AuthDialog.tsx` - User authentication UI
- `src/components/UserProfile.tsx` - User account management and statistics
- `src/utils/gameStats.ts` - Hybrid local/cloud statistics handling
- `src/services/` - All singleton services with event patterns
- `src/game/ai/` - AI implementations and interfaces
- `scripts/` - Development workflow automation
- `server/src/` - Real-time multiplayer backend
- `.vscode/mcp.json` - Appwrite MCP server configuration

## Common Gotchas

- PixiJS containers must be manually destroyed to prevent memory leaks
- AI moves are always async, handle loading states
- Theme changes require both PixiJS color updates AND CSS class updates
- Socket events need consistent naming between client/server
- YiXin integration requires external Python process running
- **Appwrite data requires user authentication - always check `isAuthenticated` before cloud operations**
- **Game statistics automatically sync between localStorage and Appwrite based on auth state**
- **MCP server credentials are configured in `.vscode/mcp.json` - never commit real API keys**
