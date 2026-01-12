import * as vscode from 'vscode';
import { SessionManager } from './sessionManager';
import { StatusBarManager } from './statusBar';
import { ProjectLinker } from './projectLinker';

export class ActivityTracker {
  private sessionManager: SessionManager;
  private statusBarManager: StatusBarManager;
  private projectLinker: ProjectLinker;
  
  private isTracking = false;
  private isPaused = false;
  private lastActivityTime: Date = new Date();
  private idleCheckInterval: NodeJS.Timeout | null = null;
  private disposables: vscode.Disposable[] = [];

  constructor(
    sessionManager: SessionManager,
    statusBarManager: StatusBarManager,
    projectLinker: ProjectLinker
  ) {
    this.sessionManager = sessionManager;
    this.statusBarManager = statusBarManager;
    this.projectLinker = projectLinker;
  }

  start() {
    if (this.isTracking) return;
    this.isTracking = true;

    // Écouter les changements de texte
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.scheme === 'file') {
          this.onActivity(e.document.uri);
        }
      })
    );

    // Écouter les changements de fichier actif
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor?.document.uri.scheme === 'file') {
          this.onActivity(editor.document.uri);
        }
      })
    );

    // Écouter les sauvegardes
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.uri.scheme === 'file') {
          this.onActivity(document.uri);
        }
      })
    );

    // Vérifier l'inactivité périodiquement
    const config = vscode.workspace.getConfiguration('eclipseTracker');
    const idleTimeout = config.get<number>('idleTimeout') || 120;

    this.idleCheckInterval = setInterval(() => {
      this.checkIdle(idleTimeout);
    }, 10000); // Check every 10 seconds

    console.log('Eclipse Tracker: Activity tracking started');
  }

  stop() {
    this.isTracking = false;
    
    // Nettoyer les listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    // Terminer la session en cours
    this.sessionManager.endCurrentSession();

    console.log('Eclipse Tracker: Activity tracking stopped');
  }

  pause() {
    this.isPaused = true;
    this.sessionManager.endCurrentSession();
  }

  resume() {
    this.isPaused = false;
  }

  private onActivity(fileUri: vscode.Uri) {
    if (!this.isTracking || this.isPaused) return;

    this.lastActivityTime = new Date();

    // Trouver le dossier racine du fichier
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
    if (!workspaceFolder) return;

    const folderPath = workspaceFolder.uri.fsPath;
    const projectId = this.projectLinker.getProjectForFolder(folderPath);

    if (!projectId) {
      // Dossier non lié, proposer de le lier
      this.statusBarManager.setUnlinked();
      return;
    }

    // Mettre à jour la session
    const fileName = fileUri.fsPath.split(/[/\\]/).pop() || 'unknown';
    this.sessionManager.recordActivity(projectId, fileName);
    this.statusBarManager.setTracking(true);
    this.statusBarManager.updateCurrentFile(fileName);
  }

  private checkIdle(idleTimeoutSeconds: number) {
    if (!this.isTracking || this.isPaused) return;

    const now = new Date();
    const idleMs = now.getTime() - this.lastActivityTime.getTime();
    const idleSeconds = idleMs / 1000;

    if (idleSeconds > idleTimeoutSeconds) {
      // L'utilisateur est inactif, terminer la session
      this.sessionManager.endCurrentSession();
      this.statusBarManager.setIdle();
    }
  }
}

