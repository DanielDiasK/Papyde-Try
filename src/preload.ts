import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getWorkspace: () => ipcRenderer.invoke('get-workspace'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    createWorkspace: (name: string, folder: string) => ipcRenderer.invoke('create-workspace', { name, folder }),
    getDocuments: () => ipcRenderer.invoke('get-documents'),
    saveDocument: (doc: any) => ipcRenderer.invoke('save-document', doc),
    deleteDocument: (id: string) => ipcRenderer.invoke('delete-document', id),
    windowMinimize: () => ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => ipcRenderer.invoke('window-maximize'),
    windowClose: () => ipcRenderer.invoke('window-close'),
    getStructure: () => ipcRenderer.invoke('get-structure'),
    saveStructure: (items: any[]) => ipcRenderer.invoke('save-structure', items),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
    selectAvatar: () => ipcRenderer.invoke('select-avatar'),
    createBackup: () => ipcRenderer.invoke('create-backup'),
    changeWorkspaceFolder: (newName?: string) => ipcRenderer.invoke('change-workspace-folder', newName),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateAvailable: (callback: (info: any) => void) => {
        const listener = (_: any, info: any) => callback(info);
        ipcRenderer.on('update-available', listener);
        return () => ipcRenderer.removeListener('update-available', listener);
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
        const listener = (_: any, info: any) => callback(info);
        ipcRenderer.on('update-not-available', listener);
        return () => ipcRenderer.removeListener('update-not-available', listener);
    },
    onUpdateProgress: (callback: (progress: any) => void) => {
        const listener = (_: any, progress: any) => callback(progress);
        ipcRenderer.on('update-progress', listener);
        return () => ipcRenderer.removeListener('update-progress', listener);
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
        const listener = (_: any, info: any) => callback(info);
        ipcRenderer.on('update-downloaded', listener);
        return () => ipcRenderer.removeListener('update-downloaded', listener);
    },
    onUpdateError: (callback: (err: string) => void) => {
        const listener = (_: any, err: string) => callback(err);
        ipcRenderer.on('update-error', listener);
        return () => ipcRenderer.removeListener('update-error', listener);
    }
});
