import * as vscode from 'vscode';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private currentFile: string = '';
  private isTracking: boolean = false;
  private isPaused: boolean = false;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'eclipse-tracker.showStatus';
    this.update();
    this.statusBarItem.show();
  }

  setTracking(tracking: boolean) {
    this.isTracking = tracking;
    this.isPaused = false;
    this.update();
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    this.update();
  }

  setIdle() {
    this.isTracking = false;
    this.update();
  }

  setUnlinked() {
    this.statusBarItem.text = '$(link) Eclipse: Link Project';
    this.statusBarItem.tooltip = 'Click to link this folder to an Eclipse project';
    this.statusBarItem.command = 'eclipse-tracker.linkProject';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }

  updateCurrentFile(fileName: string) {
    this.currentFile = fileName;
    this.update();
  }

  private update() {
    if (this.isPaused) {
      this.statusBarItem.text = '$(debug-pause) Eclipse: Paused';
      this.statusBarItem.tooltip = 'Tracking paused. Click to see status.';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.command = 'eclipse-tracker.showStatus';
    } else if (this.isTracking) {
      this.statusBarItem.text = `$(clock) Eclipse: Tracking`;
      this.statusBarItem.tooltip = this.currentFile 
        ? `Currently tracking: ${this.currentFile}`
        : 'Eclipse Time Tracker is active';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.command = 'eclipse-tracker.showStatus';
    } else {
      this.statusBarItem.text = '$(clock) Eclipse: Idle';
      this.statusBarItem.tooltip = 'No activity detected';
      this.statusBarItem.backgroundColor = undefined;
      this.statusBarItem.command = 'eclipse-tracker.showStatus';
    }
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}

