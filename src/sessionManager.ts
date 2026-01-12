import * as vscode from 'vscode';
import { EclipseApi } from './api';

interface Session {
  projectId: number;
  startTime: Date;
  endTime: Date;
  files: Set<string>;
  synced: boolean;
}

interface StoredSession {
  projectId: number;
  startTime: string;
  endTime: string;
  files: string[];
  synced: boolean;
}

const STORAGE_KEY = 'eclipse-tracker-pending-sessions';
const MIN_SESSION_DURATION_MS = 30000; // 30 secondes minimum

export class SessionManager {
  private api: EclipseApi;
  private storage: vscode.Memento;
  private currentSession: Session | null = null;
  private pendingSessions: Session[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(api: EclipseApi, storage: vscode.Memento) {
    this.api = api;
    this.storage = storage;
    this.loadPendingSessions();
    this.startSyncInterval();
  }

  private loadPendingSessions() {
    const stored = this.storage.get<StoredSession[]>(STORAGE_KEY, []);
    this.pendingSessions = stored.map(s => ({
      projectId: s.projectId,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      files: new Set(s.files),
      synced: s.synced,
    }));
  }

  private savePendingSessions() {
    const toStore: StoredSession[] = this.pendingSessions.map(s => ({
      projectId: s.projectId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      files: Array.from(s.files),
      synced: s.synced,
    }));
    this.storage.update(STORAGE_KEY, toStore);
  }

  private startSyncInterval() {
    const config = vscode.workspace.getConfiguration('eclipseTracker');
    const intervalSeconds = config.get<number>('syncInterval') || 300;

    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, intervalSeconds * 1000);
  }

  recordActivity(projectId: number, fileName: string) {
    const now = new Date();

    // Si pas de session en cours ou projet différent, créer une nouvelle session
    if (!this.currentSession || this.currentSession.projectId !== projectId) {
      this.endCurrentSession();
      this.currentSession = {
        projectId,
        startTime: now,
        endTime: now,
        files: new Set([fileName]),
        synced: false,
      };
    } else {
      // Mettre à jour la session existante
      this.currentSession.endTime = now;
      this.currentSession.files.add(fileName);
    }
  }

  endCurrentSession() {
    if (!this.currentSession) return;

    const duration = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
    
    // Ne pas enregistrer les sessions trop courtes
    if (duration >= MIN_SESSION_DURATION_MS) {
      this.pendingSessions.push({ ...this.currentSession });
      this.savePendingSessions();
    }

    this.currentSession = null;
  }

  async syncNow() {
    // Terminer la session en cours avant de sync
    const hadCurrentSession = this.currentSession !== null;
    const currentProjectId = this.currentSession?.projectId;
    this.endCurrentSession();

    const toSync = this.pendingSessions.filter(s => !s.synced);
    
    if (toSync.length === 0) {
      // Reprendre la session si nécessaire
      if (hadCurrentSession && currentProjectId) {
        this.currentSession = {
          projectId: currentProjectId,
          startTime: new Date(),
          endTime: new Date(),
          files: new Set(),
          synced: false,
        };
      }
      return;
    }

    console.log(`Eclipse Tracker: Syncing ${toSync.length} sessions...`);

    for (const session of toSync) {
      const duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000);
      const description = `VS Code: ${Array.from(session.files).slice(0, 5).join(', ')}${session.files.size > 5 ? '...' : ''}`;

      const success = await this.api.createTimeEntry({
        start_time: session.startTime.toISOString(),
        end_time: session.endTime.toISOString(),
        duration,
        description,
        project: session.projectId,
        billable: true,
      });

      if (success) {
        session.synced = true;
      }
    }

    // Nettoyer les sessions synchronisées
    this.pendingSessions = this.pendingSessions.filter(s => !s.synced);
    this.savePendingSessions();

    // Reprendre la session si nécessaire
    if (hadCurrentSession && currentProjectId) {
      this.currentSession = {
        projectId: currentProjectId,
        startTime: new Date(),
        endTime: new Date(),
        files: new Set(),
        synced: false,
      };
    }

    console.log(`Eclipse Tracker: Sync complete. ${this.pendingSessions.length} sessions pending.`);
  }

  showStatus() {
    const currentDuration = this.currentSession
      ? Math.round((new Date().getTime() - this.currentSession.startTime.getTime()) / 60000)
      : 0;

    const pendingCount = this.pendingSessions.filter(s => !s.synced).length;
    const pendingDuration = this.pendingSessions
      .filter(s => !s.synced)
      .reduce((acc, s) => acc + Math.round((s.endTime.getTime() - s.startTime.getTime()) / 60000), 0);

    const message = [
      `📊 Eclipse Tracker Status`,
      ``,
      `Current Session: ${currentDuration} min`,
      `Pending Sessions: ${pendingCount}`,
      `Pending Time: ${pendingDuration} min`,
    ].join('\n');

    vscode.window.showInformationMessage(message, { modal: true });
  }

  dispose() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.endCurrentSession();
    this.syncNow();
  }
}

