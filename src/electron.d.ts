/// <reference types="vite/client" />

interface DocumentItem {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
}

interface WorkspaceConfig {
    name: string;
    path: string;
}

interface ElectronAPI {
    getWorkspace: () => Promise<WorkspaceConfig | null>;
    getAppVersion: () => Promise<string>;
    selectFolder: () => Promise<string | null>;
    createWorkspace: (name: string, folder: string) => Promise<WorkspaceConfig | null>;
    getDocuments: () => Promise<DocumentItem[]>;
    saveDocument: (doc: DocumentItem) => Promise<DocumentItem>;
    deleteDocument: (id: string) => Promise<boolean>;
    windowMinimize: () => Promise<void>;
    windowMaximize: () => Promise<void>;
    windowClose: () => Promise<void>;
    getStructure: () => Promise<any[]>;
    saveStructure: (items: any[]) => Promise<boolean>;
    getSettings: () => Promise<any>;
    saveSettings: (settings: any) => Promise<boolean>;
    selectAvatar: () => Promise<string | null>;
    createBackup: () => Promise<{ success: boolean; message: string }>;
    changeWorkspaceFolder: (newName?: string) => Promise<WorkspaceConfig | null>;
    checkForUpdates: () => Promise<any>;
    downloadUpdate: () => Promise<boolean>;
    installUpdate: () => Promise<void>;
    onUpdateAvailable: (callback: (info: any) => void) => () => void;
    onUpdateNotAvailable: (callback: (info: any) => void) => () => void;
    onUpdateProgress: (callback: (progress: any) => void) => () => void;
    onUpdateDownloaded: (callback: (info: any) => void) => () => void;
    onUpdateError: (callback: (err: string) => void) => () => void;
}

interface Window {
    electronAPI?: ElectronAPI;
}
