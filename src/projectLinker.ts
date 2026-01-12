import * as vscode from 'vscode';
import { EclipseApi } from './api';

interface ProjectMapping {
  [folderPath: string]: number;
}

export class ProjectLinker {
  private api: EclipseApi;

  constructor(api: EclipseApi) {
    this.api = api;
  }

  private getConfig() {
    return vscode.workspace.getConfiguration('eclipseTracker');
  }

  getProjectForFolder(folderPath: string): number | null {
    const mappings = this.getConfig().get<ProjectMapping>('projectMappings') || {};
    return mappings[folderPath] || null;
  }

  async linkCurrentFolder() {
    // Obtenir le dossier courant
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    let selectedFolder: vscode.WorkspaceFolder;

    if (workspaceFolders.length === 1) {
      selectedFolder = workspaceFolders[0];
    } else {
      // Plusieurs dossiers, demander lequel lier
      const folderItems = workspaceFolders.map(f => ({
        label: f.name,
        description: f.uri.fsPath,
        folder: f,
      }));

      const selected = await vscode.window.showQuickPick(folderItems, {
        placeHolder: 'Select folder to link',
      });

      if (!selected) return;
      selectedFolder = selected.folder;
    }

    // Récupérer les projets Eclipse
    const projects = await this.api.getProjects();
    
    if (projects.length === 0) {
      vscode.window.showErrorMessage('No projects found in Eclipse Dashboard. Create a project first.');
      return;
    }

    // Afficher la liste des projets
    const projectItems = projects.map(p => ({
      label: p.title,
      description: p.client?.name || 'No client',
      projectId: p.id,
    }));

    const selectedProject = await vscode.window.showQuickPick(projectItems, {
      placeHolder: 'Select Eclipse project to link',
    });

    if (!selectedProject) return;

    // Sauvegarder le mapping
    const config = this.getConfig();
    const mappings = config.get<ProjectMapping>('projectMappings') || {};
    mappings[selectedFolder.uri.fsPath] = selectedProject.projectId;
    
    await config.update('projectMappings', mappings, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(
      `Linked "${selectedFolder.name}" to "${selectedProject.label}"`
    );
  }

  async unlinkCurrentFolder() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder open');
      return;
    }

    const config = this.getConfig();
    const mappings = config.get<ProjectMapping>('projectMappings') || {};

    // Trouver les dossiers liés
    const linkedFolders = workspaceFolders.filter(f => mappings[f.uri.fsPath]);

    if (linkedFolders.length === 0) {
      vscode.window.showInformationMessage('No linked folders in this workspace');
      return;
    }

    let selectedFolder: vscode.WorkspaceFolder;

    if (linkedFolders.length === 1) {
      selectedFolder = linkedFolders[0];
    } else {
      const folderItems = linkedFolders.map(f => ({
        label: f.name,
        description: f.uri.fsPath,
        folder: f,
      }));

      const selected = await vscode.window.showQuickPick(folderItems, {
        placeHolder: 'Select folder to unlink',
      });

      if (!selected) return;
      selectedFolder = selected.folder;
    }

    // Supprimer le mapping
    delete mappings[selectedFolder.uri.fsPath];
    await config.update('projectMappings', mappings, vscode.ConfigurationTarget.Global);

    vscode.window.showInformationMessage(`Unlinked "${selectedFolder.name}"`);
  }
}

