import * as vscode from 'vscode';
import { ActivityTracker } from './activityTracker';
import { EclipseApi } from './api';
import { SessionManager } from './sessionManager';
import { StatusBarManager } from './statusBar';
import { ProjectLinker } from './projectLinker';

let activityTracker: ActivityTracker;
let sessionManager: SessionManager;
let statusBarManager: StatusBarManager;
let projectLinker: ProjectLinker;
let api: EclipseApi;

export async function activate(context: vscode.ExtensionContext) {
  console.log('Eclipse Time Tracker is now active');

  // Initialiser les composants
  api = new EclipseApi();
  statusBarManager = new StatusBarManager();
  projectLinker = new ProjectLinker(api);
  sessionManager = new SessionManager(api, context.globalState);
  activityTracker = new ActivityTracker(sessionManager, statusBarManager, projectLinker);

  // Vérifier la configuration
  const config = vscode.workspace.getConfiguration('eclipseTracker');
  const apiToken = config.get<string>('apiToken');

  if (!apiToken) {
    vscode.window.showInformationMessage(
      'Eclipse Tracker: Configure your API token to start tracking',
      'Configure'
    ).then(selection => {
      if (selection === 'Configure') {
        vscode.commands.executeCommand('eclipse-tracker.configure');
      }
    });
  } else {
    // Valider le token et démarrer le tracking
    const isValid = await api.validateToken();
    if (isValid) {
      activityTracker.start();
      statusBarManager.setTracking(true);
    } else {
      vscode.window.showErrorMessage('Eclipse Tracker: Invalid API token. Please reconfigure.');
    }
  }

  // Enregistrer les commandes
  context.subscriptions.push(
    vscode.commands.registerCommand('eclipse-tracker.configure', async () => {
      const token = await vscode.window.showInputBox({
        prompt: 'Enter your Eclipse API Token',
        password: true,
        placeHolder: 'eclipse_xxxxxxxx...',
        validateInput: (value) => {
          if (!value.startsWith('eclipse_')) {
            return 'Token must start with "eclipse_"';
          }
          return null;
        }
      });

      if (token) {
        await config.update('apiToken', token, vscode.ConfigurationTarget.Global);
        const isValid = await api.validateToken();
        if (isValid) {
          vscode.window.showInformationMessage('Eclipse Tracker: Token configured successfully!');
          activityTracker.start();
          statusBarManager.setTracking(true);
        } else {
          vscode.window.showErrorMessage('Eclipse Tracker: Invalid token');
        }
      }
    }),

    vscode.commands.registerCommand('eclipse-tracker.linkProject', async () => {
      await projectLinker.linkCurrentFolder();
    }),

    vscode.commands.registerCommand('eclipse-tracker.unlinkProject', async () => {
      await projectLinker.unlinkCurrentFolder();
    }),

    vscode.commands.registerCommand('eclipse-tracker.showStatus', () => {
      sessionManager.showStatus();
    }),

    vscode.commands.registerCommand('eclipse-tracker.syncNow', async () => {
      await sessionManager.syncNow();
      vscode.window.showInformationMessage('Eclipse Tracker: Synced successfully!');
    }),

    vscode.commands.registerCommand('eclipse-tracker.pauseTracking', () => {
      activityTracker.pause();
      statusBarManager.setPaused(true);
      vscode.window.showInformationMessage('Eclipse Tracker: Tracking paused');
    }),

    vscode.commands.registerCommand('eclipse-tracker.resumeTracking', () => {
      activityTracker.resume();
      statusBarManager.setPaused(false);
      vscode.window.showInformationMessage('Eclipse Tracker: Tracking resumed');
    })
  );

  // Cleanup à la désactivation
  context.subscriptions.push({
    dispose: () => {
      activityTracker.stop();
      sessionManager.syncNow();
    }
  });
}

export function deactivate() {
  if (activityTracker) {
    activityTracker.stop();
  }
  if (sessionManager) {
    sessionManager.syncNow();
  }
}

