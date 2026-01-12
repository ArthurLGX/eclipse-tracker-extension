# Eclipse Time Tracker

🕐 Track your development time automatically in VS Code / Cursor and sync with [Eclipse Dashboard](https://dashboard.eclipsestudiodev.fr).

## Features

- **Automatic tracking**: No manual start/stop - tracks while you code
- **Project linking**: Associate folders with Eclipse projects
- **Offline support**: Queues sessions locally and syncs when online
- **Idle detection**: Automatically pauses when you're away
- **Low overhead**: Syncs every 5 minutes (configurable)

## Installation

### From VSIX (Manual)

1. Download the latest `.vsix` file from Releases
2. In VS Code: `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. Select the downloaded file

### From Source

```bash
git clone https://github.com/ArthurLGX/eclipse-tracker-extension
cd eclipse-tracker-extension
npm install
npm run compile
```

Then press `F5` to launch a development instance.

## Setup

### 1. Generate an API Token

1. Go to [Eclipse Dashboard Settings](https://dashboard.eclipsestudiodev.fr/dashboard/settings/integrations)
2. In the "API Tokens" section, click "Generate New Token"
3. Give it a name (e.g., "VS Code - MacBook Pro")
4. Copy the token (shown only once!)

### 2. Configure the Extension

1. Run command: `Eclipse: Configure API Token`
2. Paste your token
3. Done! ✅

### 3. Link Your Projects

1. Open a project folder in VS Code
2. Run command: `Eclipse: Link Folder to Project`
3. Select the Eclipse project to link

## Commands

| Command | Description |
|---------|-------------|
| `Eclipse: Configure API Token` | Set up or update your API token |
| `Eclipse: Link Folder to Project` | Associate current folder with an Eclipse project |
| `Eclipse: Unlink Current Folder` | Remove project association |
| `Eclipse: Show Tracking Status` | View current session and pending syncs |
| `Eclipse: Sync Now` | Force sync pending sessions |
| `Eclipse: Pause Tracking` | Temporarily pause tracking |
| `Eclipse: Resume Tracking` | Resume tracking |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `eclipseTracker.apiUrl` | `https://api.dashboard.eclipsestudiodev.fr/api` | Eclipse API URL |
| `eclipseTracker.apiToken` | `""` | Your API token |
| `eclipseTracker.syncInterval` | `300` | Sync interval in seconds (5 min) |
| `eclipseTracker.idleTimeout` | `120` | Idle detection timeout in seconds (2 min) |

## How It Works

1. **Activity Detection**: The extension listens for file edits, saves, and active editor changes
2. **Session Recording**: Activities are grouped into sessions by project
3. **Debouncing**: Idle detection prevents tracking when you're away
4. **Local Queue**: Sessions are stored locally before being synced
5. **Background Sync**: Every 5 minutes (or on close), sessions are sent to Eclipse API
6. **Time Entries**: Sessions appear as time entries in your Eclipse project's Rentability widget

## Privacy

- Only file names (not contents) are tracked
- Data is sent only to your Eclipse Dashboard instance
- No third-party analytics or telemetry

## Troubleshooting

### Token Invalid
- Make sure the token starts with `eclipse_`
- Check that the token hasn't been revoked in Dashboard settings

### Sessions Not Syncing
- Run `Eclipse: Sync Now` to force sync
- Check the Output panel (`View → Output → Eclipse Tracker`)

### Project Not Detected
- Ensure the folder is linked via `Eclipse: Link Folder to Project`
- Check `Settings → Eclipse Tracker → Project Mappings`

## License

MIT © Eclipse Studio

