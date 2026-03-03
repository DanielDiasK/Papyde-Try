import React, { useState, useEffect } from 'react';
import { User, Palette, HardDrive, RefreshCw, X, Camera, Sun, Moon, Check, FolderOpen, Download, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from './lib/utils';

export interface AppSettings {
    name: string;
    theme: 'light' | 'dark';
    avatarPath: string | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    settings: AppSettings;
    workspacePath: string;
    workspaceName: string;
    onSave: (settings: AppSettings) => void;
    onWorkspaceChange: (config: { name: string; path: string }) => void;
}

type Section = 'perfil' | 'aparencia' | 'workspace' | 'updates';

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'perfil', label: 'Perfil', icon: <User size={16} /> },
    { id: 'aparencia', label: 'Aparência', icon: <Palette size={16} /> },
    { id: 'workspace', label: 'Espaço de Trabalho', icon: <HardDrive size={16} /> },
    { id: 'updates', label: 'Atualizações', icon: <RefreshCw size={16} /> },
];

const SettingsModal = React.memo(({ open, onClose, settings, workspacePath, workspaceName, onSave, onWorkspaceChange }: Props) => {
    const [section, setSection] = useState<Section>('perfil');
    const [local, setLocal] = useState<AppSettings>(settings);
    const [backupStatus, setBackupStatus] = useState<{ type: 'idle' | 'loading' | 'ok' | 'error'; msg: string }>({ type: 'idle', msg: '' });
    const [wsLoading, setWsLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    // Update state
    const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'>('idle');
    const [updateProgress, setUpdateProgress] = useState(0);
    const [updateInfo, setUpdateInfo] = useState<any>(null);
    const [updateError, setUpdateError] = useState<string | null>(null);

    useEffect(() => {
        if (!window.electronAPI) return;

        const unsubAvailable = window.electronAPI.onUpdateAvailable((info) => {
            setUpdateInfo(info);
            setUpdateStatus('available');
        });

        const unsubNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
            setUpdateStatus('not-available');
        });

        const unsubProgress = window.electronAPI.onUpdateProgress((progress) => {
            setUpdateProgress(progress.percent);
            setUpdateStatus('downloading');
        });

        const unsubDownloaded = window.electronAPI.onUpdateDownloaded(() => {
            setUpdateStatus('downloaded');
        });

        const unsubError = window.electronAPI.onUpdateError((err) => {
            setUpdateError(err);
            setUpdateStatus('error');
        });

        return () => {
            unsubAvailable();
            unsubNotAvailable();
            unsubProgress();
            unsubDownloaded();
            unsubError();
        };
    }, []);

    useEffect(() => { if (open) { setLocal(settings); setSection('perfil'); setSaved(false); setBackupStatus({ type: 'idle', msg: '' }); } }, [open, settings]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (!open) return null;

    const handleSave = () => {
        onSave(local);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSelectAvatar = async () => {
        const path = await window.electronAPI?.selectAvatar();
        if (path) {
            const updated = { ...local, avatarPath: path };
            setLocal(updated);
            // Save immediately so sidebar updates right away
            onSave(updated);
        }
    };

    const handleBackup = async () => {
        setBackupStatus({ type: 'loading', msg: 'Criando backup...' });
        const result = await window.electronAPI?.createBackup();
        if (result?.success) setBackupStatus({ type: 'ok', msg: result.message });
        else setBackupStatus({ type: 'error', msg: result?.message || 'Erro ao criar backup.' });
    };

    const handleChangeWorkspace = async () => {
        setWsLoading(true);
        const result = await window.electronAPI?.changeWorkspaceFolder(workspaceName);
        setWsLoading(false);
        if (result) { onWorkspaceChange(result); onClose(); }
    };

    const handleCheckUpdates = async () => {
        setUpdateStatus('checking');
        setUpdateError(null);
        try {
            await window.electronAPI?.checkForUpdates();
        } catch (e) {
            setUpdateStatus('error');
            setUpdateError('Erro ao buscar atualizações.');
        }
    };

    const handleDownloadUpdate = async () => {
        try {
            await window.electronAPI?.downloadUpdate();
        } catch (e) {
            setUpdateStatus('error');
            setUpdateError('Erro ao baixar atualização.');
        }
    };

    const handleInstallUpdate = () => {
        window.electronAPI?.installUpdate();
    };

    const avatarSrc = local.avatarPath
        ? local.avatarPath
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(local.name)}&backgroundColor=transparent`;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-150" onClick={onClose} />

            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[760px] h-[520px] z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white rounded-2xl shadow-[0_32px_100px_rgba(0,0,0,0.18)] border border-[#EBEBEA] overflow-hidden flex h-full">

                    {/* Left nav */}
                    <div className="w-[200px] shrink-0 bg-[#FBFBFA] border-r border-[#EBEBEA] flex flex-col p-3 gap-1">
                        <p className="text-[11px] font-semibold text-[#989895] uppercase tracking-wider px-2 mb-2 mt-1">Configurações</p>
                        {sections.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSection(s.id)}
                                className={cn(
                                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] transition-all text-left w-full',
                                    section === s.id
                                        ? 'bg-[#37352F] text-white'
                                        : 'text-[#787774] hover:bg-[#EBEBEA] hover:text-[#37352F]'
                                )}
                            >
                                {s.icon}
                                <span className="font-medium">{s.label}</span>
                            </button>
                        ))}

                        <div className="mt-auto">
                            <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[#989895] hover:bg-[#EBEBEA] w-full">
                                <X size={14} />
                                <span>Fechar</span>
                            </button>
                        </div>
                    </div>

                    {/* Right content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-8">

                            {/* ── PERFIL ── */}
                            {section === 'perfil' && (
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h2 className="text-[20px] font-bold text-[#37352F] mb-1">Perfil</h2>
                                        <p className="text-[13px] text-[#989895]">Customize como você aparece no Papyde.</p>
                                    </div>

                                    {/* Avatar */}
                                    <div className="flex items-center gap-5">
                                        <div className="relative group cursor-pointer" onClick={handleSelectAvatar}>
                                            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#EBEBEA] bg-[#FBFBFA] shadow-sm">
                                                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera size={20} className="text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-semibold text-[#37352F] mb-1">Foto de Perfil</p>
                                            <p className="text-[12px] text-[#989895] mb-3">JPG, PNG, GIF ou WebP. Máx 5MB.</p>
                                            <button onClick={handleSelectAvatar} className="text-[13px] px-3 py-1.5 bg-[#37352F] text-white rounded-lg hover:bg-[#2F2D2A] transition-colors">
                                                Escolher arquivo
                                            </button>
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="block text-[13px] font-semibold text-[#37352F] mb-2">Nome de exibição</label>
                                        <input
                                            type="text"
                                            value={local.name}
                                            onChange={e => setLocal(prev => ({ ...prev, name: e.target.value }))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSave();
                                            }}
                                            className="w-full border border-[#EBEBEA] rounded-lg px-3 py-2.5 text-[14px] text-[#37352F] outline-none focus:border-[#37352F] bg-[#FBFBFA] focus:bg-white transition-all"
                                            placeholder="Seu nome"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── APARÊNCIA ── */}
                            {section === 'aparencia' && (
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h2 className="text-[20px] font-bold text-[#37352F] mb-1">Aparência</h2>
                                        <p className="text-[13px] text-[#989895]">Escolha o tema que preferir.</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Light */}
                                        <button
                                            onClick={() => setLocal(prev => ({ ...prev, theme: 'light' }))}
                                            className={cn(
                                                'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                                                local.theme === 'light'
                                                    ? 'border-[#37352F] bg-[#FBFBFA]'
                                                    : 'border-[#EBEBEA] hover:border-[#C0BFB8]'
                                            )}
                                        >
                                            <div className="w-full h-20 rounded-lg bg-[#fffffe] border border-[#eaeaea] overflow-hidden shadow-sm flex">
                                                <div className="w-8 h-full bg-[#fcfcfa] border-r border-[#eaeaea]" />
                                                <div className="flex-1 p-2">
                                                    <div className="h-2 w-3/4 bg-[#eaeaea] rounded mb-1.5" />
                                                    <div className="h-1.5 w-1/2 bg-[#eaeaea] rounded" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Sun size={16} className="text-[#37352F]" />
                                                <span className="text-[14px] font-semibold text-[#37352F]">Claro</span>
                                                {local.theme === 'light' && <Check size={14} className="text-[#37352F]" />}
                                            </div>
                                        </button>

                                        {/* Dark */}
                                        <button
                                            onClick={() => setLocal(prev => ({ ...prev, theme: 'dark' }))}
                                            className={cn(
                                                'flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all',
                                                local.theme === 'dark'
                                                    ? 'border-[#37352F] bg-[#FBFBFA]'
                                                    : 'border-[#EBEBEA] hover:border-[#C0BFB8]'
                                            )}
                                        >
                                            <div className="w-full h-20 rounded-lg bg-[#191919] border border-[#2F2F2F] overflow-hidden shadow-sm flex">
                                                <div className="w-8 h-full bg-[#202020] border-r border-[#2F2F2F]" />
                                                <div className="flex-1 p-2">
                                                    <div className="h-2 w-3/4 bg-[#2F2F2F] rounded mb-1.5" />
                                                    <div className="h-1.5 w-1/2 bg-[#2F2F2F] rounded" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Moon size={16} className="text-[#37352F]" />
                                                <span className="text-[14px] font-semibold text-[#37352F]">Escuro</span>
                                                {local.theme === 'dark' && <Check size={14} className="text-[#37352F]" />}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── WORKSPACE ── */}
                            {section === 'workspace' && (
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h2 className="text-[20px] font-bold text-[#37352F] mb-1">Espaço de Trabalho</h2>
                                        <p className="text-[13px] text-[#989895]">Gerencie onde seus arquivos são salvos.</p>
                                    </div>

                                    {/* Current folder */}
                                    <div className="bg-[#FBFBFA] border border-[#EBEBEA] rounded-xl p-4">
                                        <p className="text-[12px] font-semibold text-[#989895] mb-1 uppercase tracking-wider">Pasta atual</p>
                                        <div className="flex items-center gap-2 text-[13px] text-[#37352F]">
                                            <FolderOpen size={16} className="text-[#989895] shrink-0" />
                                            <span className="truncate font-mono text-[12px]">{workspacePath || 'Não configurado'}</span>
                                        </div>
                                    </div>

                                    {/* Change folder */}
                                    <div>
                                        <p className="text-[14px] font-semibold text-[#37352F] mb-1">Mover para outra pasta</p>
                                        <p className="text-[12px] text-[#989895] mb-3">Os arquivos serão copiados para o novo local. A pasta antiga permanece intacta.</p>
                                        <button
                                            onClick={handleChangeWorkspace}
                                            disabled={wsLoading}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-[#37352F] text-white rounded-lg hover:bg-[#2F2D2A] transition-all text-[13px] font-medium disabled:opacity-50"
                                        >
                                            {wsLoading ? <RefreshCw size={15} className="animate-spin" /> : <FolderOpen size={15} />}
                                            {wsLoading ? 'Movendo...' : 'Selecionar nova pasta'}
                                        </button>
                                    </div>

                                    {/* Backup */}
                                    <div className="border-t border-[#EBEBEA] pt-5">
                                        <p className="text-[14px] font-semibold text-[#37352F] mb-1">Fazer Backup</p>
                                        <p className="text-[12px] text-[#989895] mb-3">Copia todos os seus documentos para uma pasta de backup.</p>
                                        <button
                                            onClick={handleBackup}
                                            disabled={backupStatus.type === 'loading'}
                                            className="flex items-center gap-2 px-4 py-2.5 border border-[#EBEBEA] text-[#37352F] bg-white rounded-lg hover:bg-[#FBFBFA] transition-all text-[13px] font-medium disabled:opacity-50"
                                        >
                                            {backupStatus.type === 'loading'
                                                ? <RefreshCw size={15} className="animate-spin" />
                                                : <Download size={15} />}
                                            {backupStatus.type === 'loading' ? 'Criando backup...' : 'Fazer backup agora'}
                                        </button>

                                        {backupStatus.type !== 'idle' && backupStatus.type !== 'loading' && (
                                            <div className={cn(
                                                'flex items-start gap-2 mt-3 p-3 rounded-lg text-[13px]',
                                                backupStatus.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                                            )}>
                                                {backupStatus.type === 'ok' ? <Check size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                                                <span className="break-all">{backupStatus.msg}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── UPDATES ── */}
                            {section === 'updates' && (
                                <div className="flex flex-col gap-6">
                                    <div>
                                        <h2 className="text-[20px] font-bold text-[#37352F] mb-1">Atualizações</h2>
                                        <p className="text-[13px] text-[#989895]">Mantenha o Papyde sempre na versão mais recente.</p>
                                    </div>

                                    <div className="bg-[#FBFBFA] border border-[#EBEBEA] rounded-xl p-6 flex flex-col items-center text-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center",
                                            updateStatus === 'downloaded' ? "bg-green-100 text-green-600" : "bg-[#EBEBEA] text-[#37352F]"
                                        )}>
                                            <RefreshCw size={24} className={cn(updateStatus === 'checking' || updateStatus === 'downloading' ? "animate-spin" : "")} />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <p className="font-semibold text-[16px]">
                                                {updateStatus === 'idle' && 'Verificar atualizações'}
                                                {updateStatus === 'checking' && 'Buscando atualizações...'}
                                                {updateStatus === 'available' && `Nova versão disponível: ${updateInfo?.version}`}
                                                {updateStatus === 'not-available' && 'Você já está usando a versão mais recente!'}
                                                {updateStatus === 'downloading' && `Baixando atualização... ${Math.round(updateProgress)}%`}
                                                {updateStatus === 'downloaded' && 'Atualização pronta para instalar!'}
                                                {updateStatus === 'error' && 'Ops! Algo deu errado.'}
                                            </p>
                                            <p className="text-[13px] text-[#989895]">
                                                Versão atual: v1.0.0
                                            </p>
                                        </div>

                                        {updateStatus === 'downloading' && (
                                            <div className="w-full max-w-xs h-1.5 bg-[#EBEBEA] rounded-full overflow-hidden mt-2">
                                                <div
                                                    className="h-full bg-[#37352F] transition-all duration-300"
                                                    style={{ width: `${updateProgress}%` }}
                                                />
                                            </div>
                                        )}

                                        {updateError && (
                                            <p className="text-[12px] text-red-500 mt-2">{updateError}</p>
                                        )}

                                        <div className="flex gap-3 mt-2">
                                            {(updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error') && (
                                                <button
                                                    onClick={handleCheckUpdates}
                                                    className="px-4 py-2 bg-[#37352F] text-white rounded-lg hover:bg-[#2F2D2A] transition-all text-[13px] font-medium"
                                                >
                                                    Verificar agora
                                                </button>
                                            )}

                                            {updateStatus === 'available' && (
                                                <button
                                                    onClick={handleDownloadUpdate}
                                                    className="px-4 py-2 bg-[#37352F] text-white rounded-lg hover:bg-[#2F2D2A] transition-all text-[13px] font-medium"
                                                >
                                                    Baixar atualização
                                                </button>
                                            )}

                                            {updateStatus === 'downloaded' && (
                                                <button
                                                    onClick={handleInstallUpdate}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-[13px] font-medium"
                                                >
                                                    Reiniciar e Instalar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer with save */}
                        {section !== 'workspace' && (
                            <div className="border-t border-[#EBEBEA] px-8 py-4 bg-[#FBFBFA] flex items-center justify-end gap-3">
                                <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#787774] hover:text-[#37352F] transition-colors">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-5 py-2 bg-[#37352F] text-white rounded-lg hover:bg-[#2F2D2A] transition-all text-[13px] font-medium"
                                >
                                    {saved ? <Check size={14} /> : <ArrowRight size={14} />}
                                    {saved ? 'Salvo!' : 'Salvar alterações'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
});

export default SettingsModal;
