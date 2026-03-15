import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TitleBar from './TitleBar';
import SidebarTree, { SidebarItem } from './SidebarTree';
import SearchModal from './SearchModal';
import SettingsModal, { AppSettings } from './SettingsModal';
import {
    Search,
    FileText,
    Settings,
    Plus,
    Share,
    MoreHorizontal,
    Bold,
    Italic,
    Link as LinkIcon,
    List,
    Quote,
    Sparkles,
    Calendar,
    Clock,
    Clock3,
    Folder,
    FolderOpen,
    ArrowRight,
    Store,
    Type,
    Highlighter,
    Minus,
    Plus as PlusIcon,
    X,
    Table,
    LayoutGrid,
    Check
} from 'lucide-react';

interface Document {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
}

export default function App() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [activeDoc, setActiveDoc] = useState<Document | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);

    // Ref for auto-saving
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [workspaceConfig, setWorkspaceConfig] = useState<{ name: string, path: string } | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [wsName, setWsName] = useState('');
    const [wsFolder, setWsFolder] = useState('');
    const [sidebarItems, setSidebarItems] = useState<SidebarItem[]>([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [appSettings, setAppSettings] = useState<AppSettings>({ name: 'Usuário', theme: 'light', avatarPath: null });

    // Floating Popup Toolbar State
    const [toolbarState, setToolbarState] = useState<{ visible: boolean, top: number, left: number }>({ visible: false, top: 0, left: 0 });
    const [fontSize, setFontSize] = useState<number | string>(3); // HTML font size 1-7
    const [currentTextColor, setCurrentTextColor] = useState<string>('inherit');

    // Export Modal and More Menu
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState({ filename: '', format: 'pdf' });
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);

    // Ref to save the text selection range so we can restore it when typing in inputs
    const savedRangeRef = useRef<Range | null>(null);

    const checkSelection = () => {
        setTimeout(() => {
            if (document.activeElement?.closest?.('.editor-toolbar-popup')) {
                return; // Do not hide when the toolbar input is focused
            }

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                setToolbarState(prev => prev.visible ? { ...prev, visible: false } : prev);
                return;
            }

            let node = selection.anchorNode;
            if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;

            if (node && (node as Element).closest?.('.editor-content')) {
                const range = selection.getRangeAt(0);
                savedRangeRef.current = range.cloneRange(); // Save selection
                const rect = range.getBoundingClientRect();
                setToolbarState({
                    visible: true,
                    top: rect.top - 8,
                    left: rect.left + (rect.width / 2)
                });
                // Try to get current font size and colors
                try {
                    const currentSize = document.queryCommandValue('fontSize');
                    if (currentSize) setFontSize(parseInt(currentSize) || 3);

                    const fColor = document.queryCommandValue('foreColor');
                    setCurrentTextColor(fColor ? fColor : 'inherit');
                } catch (e) { }
            } else {
                setToolbarState(prev => prev.visible ? { ...prev, visible: false } : prev);
            }
        }, 10);
    };

    // Handle text selection for dynamic toolbar
    useEffect(() => {
        document.addEventListener('selectionchange', checkSelection);
        return () => document.removeEventListener('selectionchange', checkSelection);
    }, []);

    // Hide toolbar when starting to type or click elsewhere
    useEffect(() => {
        const handleHide = (e: MouseEvent) => {
            if (!(e.target as Element).closest?.('.editor-toolbar-popup')) {
                setToolbarState(prev => prev.visible ? { ...prev, visible: false } : prev);
            }
            if (!(e.target as Element).closest?.('.more-dropdown-menu')) {
                setMoreMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleHide);
        return () => document.removeEventListener('mousedown', handleHide);
    }, []);

    // Export and insertion logic
    const handleExportDocument = () => {
        if (!activeDoc) return;
        const editor = document.querySelector('.editor-content');
        if (!editor) return;

        const { filename, format } = exportData;
        const finalName = filename || activeDoc.title || 'Exportação';
        const html = editor.innerHTML;

        if (format === 'pdf') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`<html><head><title>${finalName}</title><style>
                body { font-family: sans-serif; padding: 40px; color: #37352F; line-height: 1.6; }
                table { border-collapse: collapse; width: auto; max-width: 100%; margin: 16px 0; border: 1px solid #EBEBEA; }
                td, th { border: 1px solid #EBEBEA; padding: 12px; }
                .editor-columns { display: flex; gap: 16px; margin: 16px 0; }
                .editor-col { flex: 1; padding: 12px; border: 1px solid #EBEBEA; border-radius: 4px; }
                </style></head><body><h2>${activeDoc.title}</h2>${html}</body></html>`);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        } else if (format === 'txt') {
            const textContent = (editor as HTMLElement).innerText;
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${finalName}.txt`;
            link.click();
            URL.revokeObjectURL(url);
        } else if (format === 'word') {
            const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>" + finalName + "</title><style>table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #ccc;padding:8px}</style></head><body><h2>" + activeDoc.title + "</h2>";
            const footer = "</body></html>";
            const blob = new Blob(['\ufeff', header + html + footer], { type: 'application/msword;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${finalName}.doc`;
            link.click();
            URL.revokeObjectURL(url);
        }
        setExportModalOpen(false);
    };

    const insertTable = () => {
        // Table with resize: both on td
        const tableHTML = `<br><table class="editor-table -ml-1" style="width: auto; max-width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; border: 1px solid #EBEBEA;" contenteditable="true">
            <tbody>
                <tr>
                    <td style="border: 1px solid #EBEBEA; padding: 12px; min-width: 100px; resize: both; overflow: auto;"><br></td>
                    <td style="border: 1px solid #EBEBEA; padding: 12px; min-width: 100px; resize: both; overflow: auto;"><br></td>
                </tr>
                <tr>
                    <td style="border: 1px solid #EBEBEA; padding: 12px; min-width: 100px; resize: both; overflow: auto;"><br></td>
                    <td style="border: 1px solid #EBEBEA; padding: 12px; min-width: 100px; resize: both; overflow: auto;"><br></td>
                </tr>
            </tbody>
        </table><br>`;
        document.execCommand('insertHTML', false, tableHTML);
        setMoreMenuOpen(false);
    };

    const insertColumns = () => {
        // Pseudo columns using flex
        const colHTML = `<br><div class="editor-columns" style="display: flex; gap: 16px; margin: 16px 0; width: 100%;" contenteditable="false">
            <div class="editor-col" contenteditable="true" style="flex: 1; min-height: 50px; padding: 12px; border: 1px dashed #C0BFB8; border-radius: 4px; resize: horizontal; overflow: auto;"><br></div>
            <div class="editor-col" contenteditable="true" style="flex: 1; min-height: 50px; padding: 12px; border: 1px dashed #C0BFB8; border-radius: 4px; resize: horizontal; overflow: auto;"><br></div>
        </div><br>`;
        document.execCommand('insertHTML', false, colHTML);
        setMoreMenuOpen(false);
    };

    // Load documents on mount
    useEffect(() => {
        loadConfigAndDocuments();
    }, []);

    // Load settings on mount
    useEffect(() => {
        window.electronAPI?.getSettings().then(s => {
            if (s) {
                setAppSettings(s);
                applyTheme(s.theme);
            }
        });
    }, []);

    const applyTheme = (theme: 'light' | 'dark') => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
    };

    // Ctrl+K shortcut to open search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const loadConfigAndDocuments = async () => {
        if (window.electronAPI) {
            const config = await window.electronAPI.getWorkspace();
            setWorkspaceConfig(config);
            if (config) {
                const docs = await window.electronAPI.getDocuments();
                setDocuments(docs);
                const realDocIds = new Set(docs.map(d => d.id));

                const rawStructure: SidebarItem[] = await window.electronAPI.getStructure();

                // Remove orphaned document entries (file was deleted externally / was _structure.json)
                const cleanedStructure = rawStructure.filter(i =>
                    i.type === 'folder' || (i.type === 'document' && i.docId && realDocIds.has(i.docId))
                );

                // Find docs not yet in structure
                const existingDocIds = new Set(cleanedStructure.filter(i => i.type === 'document').map(i => i.docId));
                const newItems: SidebarItem[] = docs
                    .filter(d => !existingDocIds.has(d.id))
                    .map((d, idx) => ({
                        id: crypto.randomUUID(),
                        type: 'document' as const,
                        name: d.title || 'Sem título',
                        docId: d.id,
                        parentId: null as string | null,
                        order: cleanedStructure.length + idx
                    }));

                const finalStructure = [...cleanedStructure, ...newItems];
                setSidebarItems(finalStructure);

                // Persist cleaned structure only if it changed
                if (finalStructure.length !== rawStructure.length || newItems.length > 0) {
                    window.electronAPI.saveStructure(finalStructure);
                }

                if (docs.length > 0 && !activeDoc) setActiveDoc(docs[0]);
            }
        }
        setLoadingConfig(false);
    };

    const persistStructure = useCallback((items: SidebarItem[]) => {
        setSidebarItems(items);
        window.electronAPI?.saveStructure(items);
    }, []);

    const createNewDocument = useCallback(async () => {
        const newDoc: Document = {
            id: crypto.randomUUID(),
            title: '',
            content: '',
            updatedAt: Date.now()
        };

        if (window.electronAPI) {
            const savedDoc = await window.electronAPI.saveDocument(newDoc);
            if (savedDoc) {
                setDocuments(prev => [savedDoc, ...prev]);
                setActiveDoc(savedDoc);
                const newSidebarItem: SidebarItem = { id: crypto.randomUUID(), type: 'document', name: '', docId: savedDoc.id, parentId: null, order: Date.now() };
                persistStructure([newSidebarItem, ...sidebarItems]);
            }
        } else {
            setDocuments(prev => [newDoc, ...prev]);
            setActiveDoc(newDoc);
        }
    }, [sidebarItems, persistStructure]);

    const createNewFolder = useCallback(() => {
        const folderItem: SidebarItem = { id: crypto.randomUUID(), type: 'folder', name: 'Nova Pasta', docId: undefined, parentId: null, order: Date.now(), isOpen: false };
        persistStructure([folderItem, ...sidebarItems]);
    }, [sidebarItems, persistStructure]);

    const deleteItem = useCallback(async (sidebarId: string) => {
        setSidebarItems(prev => {
            const item = prev.find(i => i.id === sidebarId);
            if (!item) return prev;

            if (item.type === 'document' && item.docId && window.electronAPI) {
                window.electronAPI.deleteDocument(item.docId);
                setDocuments(docs => docs.filter(d => d.id !== item.docId));
                setActiveDoc(current => current?.id === item.docId ? null : current);
            }

            const getAllDescendants = (parentId: string, allItems: SidebarItem[]): string[] => {
                const children = allItems.filter(i => i.parentId === parentId);
                return [parentId, ...children.flatMap(c => getAllDescendants(c.id, allItems))];
            };

            const toRemove = new Set(getAllDescendants(sidebarId, prev));

            // Delete child documents (side effect inside state setter is usually bad, but we need the latest state)
            prev.filter(i => toRemove.has(i.id) && i.type === 'document' && i.id !== sidebarId).forEach(child => {
                if (child.docId && window.electronAPI) window.electronAPI.deleteDocument(child.docId);
            });

            const nextItems = prev.filter(i => !toRemove.has(i.id));
            window.electronAPI?.saveStructure(nextItems);
            return nextItems;
        });
    }, [activeDoc?.id]); // need activeDoc to check if we close it

    const updateActiveDocument = (updates: Partial<Document>) => {
        if (!activeDoc) return;
        const updatedDoc = { ...activeDoc, ...updates, updatedAt: Date.now() };
        setActiveDoc(updatedDoc);
        setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
        // Update sidebar item name when title changes
        if (updates.title !== undefined) {
            const updated = sidebarItems.map(i => i.docId === updatedDoc.id ? { ...i, name: updates.title || '' } : i);
            persistStructure(updated);
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            if (window.electronAPI) await window.electronAPI.saveDocument(updatedDoc);
        }, 1000);
    };


    const handleToggleFolder = useCallback((id: string) => {
        setSidebarItems(prev => {
            const next = prev.map(i => i.id === id ? { ...i, isOpen: !i.isOpen } : i);
            window.electronAPI?.saveStructure(next);
            return next;
        });
    }, []);

    const handleRenameItem = useCallback((id: string, newName: string) => {
        setSidebarItems(prev => {
            const next = prev.map(i => i.id === id ? { ...i, name: newName } : i);
            window.electronAPI?.saveStructure(next);
            return next;
        });
    }, []);

    const handleSelectFolder = async () => {
        if (window.electronAPI) {
            const folder = await window.electronAPI.selectFolder();
            if (folder) setWsFolder(folder);
        }
    };

    const handleCreateWorkspace = async () => {
        if (!wsName || !wsFolder) return;
        if (window.electronAPI) {
            const config = await window.electronAPI.createWorkspace(wsName, wsFolder);
            if (config) {
                setWorkspaceConfig(config);
                const docs = await window.electronAPI.getDocuments();
                setDocuments(docs);
                if (docs.length > 0) setActiveDoc(docs[0]);

                const currentSettings = await window.electronAPI.getSettings();
                if (currentSettings && currentSettings.name === 'Usuário') {
                    const cleanName = wsName.split(' ')[0]; // Opcional, pegando primeira palavra ou só deixando wsName.
                    const updatedSettings = { ...currentSettings, name: cleanName };
                    window.electronAPI.saveSettings(updatedSettings);
                    setAppSettings(updatedSettings);
                }
            }
        }
    };

    const handleSearchClose = useCallback(() => setSearchOpen(false), []);
    const handleSelectDoc = useCallback((docId: string) => {
        const doc = documents.find(d => d.id === docId);
        if (doc) setActiveDoc(doc);
    }, [documents]);

    const handleSettingsClose = useCallback(() => setSettingsOpen(false), []);
    const handleSaveSettings = useCallback((s: AppSettings) => {
        setAppSettings(s);
        applyTheme(s.theme);
        window.electronAPI?.saveSettings(s);
    }, []);
    const handleWorkspaceChange = useCallback((cfg: { name: string, path: string }) => {
        setWorkspaceConfig(cfg);
    }, []);

    if (loadingConfig) {
        return (
            <div className="flex flex-col h-screen w-full bg-[#FFFFFF]">
                <TitleBar />
                <div className="flex-1 flex items-center justify-center text-[#787774]">Carregando...</div>
            </div>
        );
    }

    if (!workspaceConfig) {
        return (
            <div className="flex flex-col h-screen w-full bg-[#FFFFFF] text-[#37352F] overflow-hidden font-sans selection:bg-[#2383E2]/30">
                <TitleBar />
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-16 h-16 rounded-2xl bg-[#FBFBFA] border border-[#EBEBEA] flex items-center justify-center mb-8 shadow-sm">
                            <Sparkles size={32} className="text-[#37352F]" />
                        </div>

                        <h1 className="text-[32px] font-bold mb-4 tracking-tight leading-tight">Boas-vindas ao seu espaço</h1>
                        <p className="text-[15px] text-[#787774] mb-8 leading-relaxed">
                            Para começar, defina o nome do seu espaço e onde deseja salvar seus arquivos. Tudo ficará sincronizado na pasta escolhida localmente.
                        </p>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[13px] font-medium text-[#787774] mb-2">Nome do Espaço</label>
                                <input
                                    type="text"
                                    placeholder="ex: Papyde (seu nome)"
                                    value={wsName}
                                    onChange={(e) => setWsName(e.target.value)}
                                    className="w-full bg-[#FBFBFA] border border-[#EBEBEA] rounded-lg px-4 py-3 text-[15px] outline-none focus:border-[#2383E2]/50 focus:bg-white shadow-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-[13px] font-medium text-[#787774] mb-2">Local de Armazenamento</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-[#FBFBFA] border border-[#EBEBEA] rounded-lg px-4 py-3 text-[15px] text-[#37352F] truncate shadow-sm flex items-center">
                                        {wsFolder ? wsFolder : <span className="text-[#989895]">Selecione uma pasta...</span>}
                                    </div>
                                    <button
                                        onClick={handleSelectFolder}
                                        className="shrink-0 px-4 py-3 bg-white border border-[#EBEBEA] text-[#37352F] rounded-lg hover:bg-[#FBFBFA] transition-colors shadow-sm flex items-center justify-center"
                                    >
                                        <FolderOpen size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCreateWorkspace}
                            disabled={!wsName || !wsFolder}
                            className="w-full mt-10 bg-[#37352F] text-white px-4 py-3.5 rounded-lg text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-[#2F2D2A] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(0,0,0,0.1)] group"
                        >
                            <span>Entrar no Espaço</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen w-full bg-[#FFFFFF] text-[#37352F] overflow-hidden font-sans selection:bg-[#2383E2]/30">
            <TitleBar />
            {searchOpen && (
                <SearchModal
                    open={searchOpen}
                    onClose={handleSearchClose}
                    documents={documents}
                    sidebarItems={sidebarItems}
                    onSelectDoc={handleSelectDoc}
                    onCreateDoc={createNewDocument}
                    onCreateFolder={createNewFolder}
                />
            )}
            {settingsOpen && (
                <SettingsModal
                    open={settingsOpen}
                    onClose={handleSettingsClose}
                    settings={appSettings}
                    workspacePath={workspaceConfig?.path ?? ''}
                    workspaceName={workspaceConfig?.name ?? ''}
                    onSave={handleSaveSettings}
                    onWorkspaceChange={handleWorkspaceChange}
                />
            )}
            <div className="flex flex-1 overflow-hidden">

                {/* Sidebar */}
                <div className="w-[240px] flex flex-col shrink-0 border-r border-[#EBEBEA] bg-[#FBFBFA] h-full relative group/sidebar transition-all duration-300">

                    {/* Workspace Selector */}
                    <div className="px-2 pt-3 pb-2">
                        <button className="w-full flex items-center gap-2 px-2 py-1 rounded-[4px] hover:bg-[#EBEBEA] transition-colors cursor-pointer group">
                            <div className="w-5 h-5 rounded-[4px] bg-[#EBEBEA] flex items-center justify-center text-[#37352F] text-[12px] font-bold shrink-0 border border-[#E1E1E0]">
                                D
                            </div>
                            <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="text-[14px] font-semibold text-[#37352F] truncate">{workspaceConfig.name}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal size={14} className="text-[#989895]" />
                            </div>
                        </button>
                    </div>

                    {/* Top Navigation */}
                    <div className="px-2 space-y-[2px]">
                        <button
                            onClick={() => setSearchOpen(true)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[14px] text-[#787774] hover:bg-[#EBEBEA] transition-colors cursor-pointer group hover:text-[#37352F]"
                        >
                            <Search size={16} className="text-[#989895] group-hover:text-[#37352F] transition-colors" />
                            <span className="font-medium">Pesquisar</span>
                            <div className="ml-auto flex items-center gap-0.5">
                                <kbd className="text-[10px] font-medium text-[#989895] bg-white border border-[#E1E1E0] rounded px-1.5 py-0.5 leading-none shadow-[0_1px_0_rgba(0,0,0,0.08)]">Ctrl</kbd>
                                <kbd className="text-[10px] font-medium text-[#989895] bg-white border border-[#E1E1E0] rounded px-1.5 py-0.5 leading-none shadow-[0_1px_0_rgba(0,0,0,0.08)]">K</kbd>
                            </div>
                        </button>

                        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[14px] text-[#787774] hover:bg-[#EBEBEA] transition-colors cursor-pointer group hover:text-[#37352F]">
                            <Store size={16} className="text-[#989895] group-hover:text-[#37352F] transition-colors" />
                            <span className="font-medium">Marketplace</span>
                        </button>

                        <button
                            onClick={createNewDocument}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[14px] text-[#37352F] hover:bg-[#EBEBEA] transition-colors cursor-pointer group"
                        >
                            <div className="w-4 h-4 rounded-sm bg-[#37352F] flex items-center justify-center group-hover:bg-[#2F2D2A] transition-colors">
                                <Plus size={12} className="text-white" />
                            </div>
                            <span className="font-medium">Nova página</span>
                        </button>
                    </div>

                    {/* Documents Section */}
                    <div className="mt-6 flex-1 overflow-y-auto px-2 pb-16 custom-scrollbar">
                        <div className="px-2 mb-2 flex items-center text-[11px] font-semibold text-[#989895] hover:text-[#37352F] transition-colors cursor-pointer group">
                            <span className="uppercase tracking-wider flex-1">Documentos</span>
                            <button onClick={createNewFolder} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#EBEBEA] p-[2px] rounded-sm" title="Nova Pasta">
                                <Folder size={13} className="text-[#989895] hover:text-[#37352F]" />
                            </button>
                            <button onClick={createNewDocument} className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#EBEBEA] p-[2px] rounded-sm ml-1" title="Novo Documento">
                                <Plus size={13} className="text-[#989895] hover:text-[#37352F]" />
                            </button>
                        </div>

                        {sidebarItems.length === 0 && (
                            <div className="px-2 py-2 text-[13px] text-[#989895] italic">Nenhuma página</div>
                        )}

                        <SidebarTree
                            items={sidebarItems}
                            activeDocId={activeDoc?.id ?? null}
                            onSelectDoc={(docId) => {
                                const doc = documents.find(d => d.id === docId);
                                if (doc) setActiveDoc(doc);
                            }}
                            onDeleteItem={deleteItem}
                            onToggleFolder={handleToggleFolder}
                            onReorder={persistStructure}
                            onRenameItem={handleRenameItem}
                        />
                    </div>

                    {/* Profile (Bottom fixed) with hover effect */}
                    <div className="absolute bottom-0 left-0 w-full p-2 bg-[#FBFBFA]">
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="w-full flex items-center gap-2 px-2 py-2 rounded-[4px] hover:bg-[#EBEBEA] transition-all duration-200 cursor-pointer group"
                        >
                            <div className="relative shrink-0">
                                <div className="w-7 h-7 rounded-full bg-[#EBEBEA] border border-[#E1E1E0] overflow-hidden flex items-center justify-center p-[2px] transition-transform group-hover:scale-105">
                                    <img
                                        src={appSettings.avatarPath
                                            ? appSettings.avatarPath
                                            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(appSettings.name)}&backgroundColor=transparent`}
                                        alt="Profile"
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                </div>
                                <div className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 bg-[#505050] border-2 border-[#FBFBFA] rounded-full"></div>
                            </div>
                            <div className="flex flex-col items-start min-w-0 flex-1 justify-center">
                                <span className="text-[14px] font-semibold text-[#37352F] truncate">{appSettings.name}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Settings size={14} className="text-[#989895]" />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-white relative">

                    {/* Top Bar (Breadcrumbs & Actions) */}
                    <div className="h-12 flex items-center justify-between px-6 shrink-0 w-full">
                        {/* Breadcrumbs */}
                        <div className="flex items-center text-[14px]">
                            <span className="text-[#989895] hover:underline cursor-pointer transition-colors hover:text-[#37352F]">Documentos</span>
                            <span className="mx-2 text-[#989895]">/</span>
                            <span className="text-[#37352F] px-1 py-0.5 rounded-[4px] hover:bg-[#EBEBEA] transition-colors cursor-pointer truncate max-w-[200px]">
                                {activeDoc?.title || 'Sem título'}
                            </span>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-4 text-[#787774]">
                            <span className="text-[12px] mr-2">
                                {activeDoc ? `Editado ${new Date(activeDoc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                            <button
                                onClick={() => {
                                    setExportData(prev => ({ ...prev, filename: activeDoc?.title || 'Documento' }));
                                    setExportModalOpen(true);
                                }}
                                className="hover:text-[#37352F] hover:bg-[#EBEBEA] dark:hover:bg-[#383838] dark:hover:text-[#E8E8E6] p-1 rounded-[4px] transition-colors"
                            >
                                <Share size={18} />
                            </button>

                            <div className="relative more-dropdown-menu">
                                <button
                                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                    className="hover:text-[#37352F] hover:bg-[#EBEBEA] dark:hover:bg-[#383838] dark:hover:text-[#E8E8E6] p-1 rounded-[4px] transition-colors"
                                >
                                    <MoreHorizontal size={20} />
                                </button>

                                {moreMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#2F2F2F] border border-[#EBEBEA] dark:border-[#404040] shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-[8px] py-1.5 z-[100] animate-in slide-in-from-top-2 duration-150">
                                        <button
                                            onClick={insertTable}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[14px] text-[#37352F] dark:text-[#E8E8E6] hover:bg-[#FBFBFA] dark:hover:bg-[#404040] transition-colors"
                                        >
                                            <Table size={16} className="text-[#989895]" />
                                            <span>Inserir Tabela</span>
                                        </button>
                                        <button
                                            onClick={insertColumns}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[14px] text-[#37352F] dark:text-[#E8E8E6] hover:bg-[#FBFBFA] dark:hover:bg-[#404040] transition-colors"
                                        >
                                            <LayoutGrid size={16} className="text-[#989895]" />
                                            <span>Adicionar Colunas</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Editor Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar w-full flex justify-center pb-32 pt-10">
                        <div className="w-full max-w-[900px] px-12 md:px-24 flex flex-col gap-4">

                            {activeDoc && documents.length > 0 ? (
                                <>
                                    {/* Title */}
                                    <input
                                        type="text"
                                        placeholder="Sem título"
                                        value={activeDoc.title}
                                        onChange={(e) => updateActiveDocument({ title: e.target.value })}
                                        className="text-[40px] font-bold text-[#37352F] outline-none leading-[1.2] placeholder:text-[#DBDBD7] w-full bg-transparent"
                                    />

                                    {/* Content Body */}
                                    <div
                                        ref={(el) => {
                                            if (el && activeDoc && el.getAttribute('data-doc-id') !== activeDoc.id) {
                                                el.innerHTML = activeDoc.content;
                                                el.setAttribute('data-doc-id', activeDoc.id);
                                            }
                                        }}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(e) => updateActiveDocument({ content: e.currentTarget.innerHTML })}
                                        onMouseUp={checkSelection}
                                        onKeyUp={(e) => {
                                            if (e.key === 'Shift' || e.key.includes('Arrow')) checkSelection();
                                            else setToolbarState(prev => prev.visible ? { ...prev, visible: false } : prev);
                                        }}
                                        className="editor-content text-[16px] leading-[1.6] text-[#37352F] outline-none w-full bg-transparent min-h-[400px] empty:before:content-[attr(data-placeholder)] empty:before:text-[#DBDBD7] empty:before:pointer-events-none cursor-text"
                                        data-placeholder="Comece a digitar focar..."
                                        style={{ scrollbarWidth: 'none' }}
                                    />
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-[70vh] text-[#37352F] animate-in fade-in duration-500 w-full">
                                    <div className="max-w-2xl w-full flex flex-col items-center text-center">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-16 h-16 rounded-full bg-[#FBFBFA] border border-[#EBEBEA] flex items-center justify-center shadow-sm">
                                                <Sparkles size={28} className="text-[#37352F]" />
                                            </div>
                                        </div>
                                        <h2 className="text-[32px] font-bold mb-4 tracking-tight text-[#37352F]">
                                            {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}, Dias!
                                        </h2>

                                        <div className="flex flex-wrap items-center justify-center gap-3 mb-10 text-[14px] font-medium text-[#787774]">
                                            <div className="flex items-center gap-2 bg-[#FBFBFA] border border-[#EBEBEA] px-3.5 py-2 rounded-full shadow-sm">
                                                <Calendar size={16} />
                                                <span>{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).replace(/^\w/, c => c.toUpperCase())}</span>
                                            </div>
                                            <div className="flex items-center gap-2 bg-[#FBFBFA] border border-[#EBEBEA] px-3.5 py-2 rounded-full shadow-sm">
                                                <Clock size={16} />
                                                <span>{new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())}</span>
                                            </div>
                                        </div>

                                        {documents.length > 0 && (
                                            <div className="w-full max-w-lg mt-4 text-left">
                                                <div className="flex items-center gap-2 mb-4 text-[#787774] font-medium text-[13px] px-2">
                                                    <Clock3 size={16} />
                                                    <span className="uppercase tracking-wider">Abertos Recentemente</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {documents.slice(0, 4).map((doc) => (
                                                        <button
                                                            key={doc.id}
                                                            onClick={() => setActiveDoc(doc)}
                                                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[#FBFBFA] border border-transparent hover:border-[#EBEBEA] transition-all group"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-8 h-8 rounded shrink-0 bg-[#EBEBEA]/50 flex items-center justify-center group-hover:bg-white transition-colors">
                                                                    <FileText size={16} className="text-[#787774] group-hover:text-[#37352F]" />
                                                                </div>
                                                                <span className="font-medium text-[15px] truncate text-[#37352F]">
                                                                    {doc.title || 'Sem título'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[12px] text-[#989895] shrink-0">
                                                                Editado às {new Date(doc.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Floating Popup Toolbar */}
                    {toolbarState.visible && (
                        <div
                            className="editor-toolbar-popup fixed z-[100] -translate-x-1/2 -translate-y-[calc(100%+8px)] bg-white dark:bg-[#2F2F2F] border border-[#EBEBEA] dark:border-transparent shadow-[0_4px_20px_rgba(0,0,0,0.1),_0_0_2px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25),_0_0_2px_rgba(0,0,0,0.3)] rounded-[8px] px-2 py-1.5 flex flex-nowrap items-center gap-1 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap"
                            style={{ top: toolbarState.top, left: toolbarState.left }}
                            onMouseDown={(e) => e.preventDefault()} // Keep selection active!
                        >
                            {/* Font Size controls */}
                            <div className="flex items-center gap-0.5 bg-[#FBFBFA] border border-[#EBEBEA] dark:border-transparent dark:bg-[#404040] rounded px-1 h-7 mr-1">
                                <button
                                    onClick={() => {
                                        const current = Number(fontSize) || 3;
                                        const newSize = Math.max(1, current - 1);
                                        setFontSize(newSize);
                                        if (savedRangeRef.current) {
                                            const sel = window.getSelection();
                                            sel?.removeAllRanges();
                                            sel?.addRange(savedRangeRef.current);
                                        }
                                        document.execCommand('fontSize', false, newSize.toString());
                                    }}
                                    className="w-5 h-5 flex items-center justify-center text-[#787774] dark:text-[#E8E8E6] hover:bg-[#EBEBEA] dark:hover:bg-[#505050] rounded transition-colors"
                                >
                                    <Minus size={12} />
                                </button>
                                <input
                                    type="number"
                                    min={1}
                                    max={7}
                                    value={fontSize}
                                    onMouseDown={(e) => e.stopPropagation()} // Stop propagation here!
                                    onChange={(e) => {
                                        if (e.target.value === '') {
                                            setFontSize('');
                                            return;
                                        }
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val)) setFontSize(val);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = Math.max(1, Math.min(7, Number(fontSize) || 3));
                                            setFontSize(val);
                                            if (savedRangeRef.current) {
                                                const sel = window.getSelection();
                                                sel?.removeAllRanges();
                                                sel?.addRange(savedRangeRef.current);
                                            }
                                            document.execCommand('fontSize', false, val.toString());
                                        }
                                    }}
                                    onBlur={() => {
                                        try {
                                            const currentSize = document.queryCommandValue('fontSize');
                                            setFontSize(parseInt(currentSize) || 3);
                                        } catch (e) { setFontSize(3) }
                                    }}
                                    className="text-[12px] font-medium text-[#37352F] dark:text-[#E8E8E6] bg-transparent outline-none w-4 text-center appearance-none leading-none select-all custom-number-input"
                                />
                                <button
                                    onClick={() => {
                                        const current = Number(fontSize) || 3;
                                        const newSize = Math.min(7, current + 1);
                                        setFontSize(newSize);
                                        if (savedRangeRef.current) {
                                            const sel = window.getSelection();
                                            sel?.removeAllRanges();
                                            sel?.addRange(savedRangeRef.current);
                                        }
                                        document.execCommand('fontSize', false, newSize.toString());
                                    }}
                                    className="w-5 h-5 flex items-center justify-center text-[#787774] dark:text-[#E8E8E6] hover:bg-[#EBEBEA] dark:hover:bg-[#505050] rounded transition-colors"
                                >
                                    <PlusIcon size={12} />
                                </button>
                            </div>

                            <button onClick={() => document.execCommand('bold', false, '')} className="w-7 h-7 rounded hover:bg-[#EBEBEA] dark:hover:bg-[#404040] flex items-center justify-center text-[#37352F] dark:text-[#E8E8E6] transition-colors shrink-0" title="Negrito">
                                <Bold size={14} strokeWidth={2.5} />
                            </button>
                            <button onClick={() => document.execCommand('italic', false, '')} className="w-7 h-7 rounded hover:bg-[#EBEBEA] dark:hover:bg-[#404040] flex items-center justify-center text-[#37352F] dark:text-[#E8E8E6] transition-colors shrink-0" title="Itálico">
                                <Italic size={14} />
                            </button>
                            <button onClick={() => {
                                const url = prompt('Digite a URL do link:');
                                if (url) document.execCommand('createLink', false, url);
                            }} className="w-7 h-7 rounded hover:bg-[#EBEBEA] dark:hover:bg-[#404040] flex items-center justify-center text-[#37352F] dark:text-[#E8E8E6] transition-colors shrink-0" title="Link">
                                <LinkIcon size={14} />
                            </button>

                            <div className="w-[1px] h-4 bg-[#EBEBEA] dark:bg-[#505050] mx-1 border-none shrink-0"></div>

                            <button onClick={() => document.execCommand('insertUnorderedList', false, '')} className="w-7 h-7 rounded hover:bg-[#EBEBEA] dark:hover:bg-[#404040] flex items-center justify-center text-[#37352F] dark:text-[#E8E8E6] transition-colors shrink-0" title="Lista">
                                <List size={14} />
                            </button>
                            <button onClick={() => document.execCommand('formatBlock', false, 'BLOCKQUOTE')} className="w-7 h-7 rounded hover:bg-[#EBEBEA] dark:hover:bg-[#404040] flex items-center justify-center text-[#37352F] dark:text-[#E8E8E6] transition-colors shrink-0" title="Citação">
                                <Quote size={14} />
                            </button>

                            <div className="w-[1px] h-4 bg-[#EBEBEA] dark:bg-[#505050] mx-1 border-none shrink-0"></div>

                            {/* Colors Section */}
                            <div className="flex items-center gap-1 shrink-0">
                                {/* Text Color Picker string/circle */}
                                <div className="relative w-8 h-8 flex items-center justify-center hover:bg-[#EBEBEA] dark:hover:bg-[#404040] rounded transition-colors overflow-hidden group cursor-pointer" title="Cor do Texto">
                                    <input
                                        type="color"
                                        className="absolute inset-[-10px] w-12 h-12 opacity-0 cursor-pointer"
                                        value={currentTextColor !== 'inherit' && currentTextColor.startsWith('#') ? currentTextColor : '#37352F'}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            if (savedRangeRef.current) {
                                                const sel = window.getSelection();
                                                sel?.removeAllRanges();
                                                sel?.addRange(savedRangeRef.current);
                                            }
                                            document.execCommand('foreColor', false, e.target.value);
                                            setCurrentTextColor(e.target.value);
                                        }}
                                    />
                                    <div
                                        className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-inner"
                                        style={{ backgroundColor: currentTextColor !== 'inherit' && currentTextColor !== '' ? currentTextColor : 'var(--p-text)' }}
                                    ></div>
                                </div>

                                <button onClick={() => {
                                    if (savedRangeRef.current) {
                                        const sel = window.getSelection();
                                        sel?.removeAllRanges();
                                        sel?.addRange(savedRangeRef.current);
                                    }
                                    document.execCommand('removeFormat', false, '');

                                    // Force a clearing approach for the selected text
                                    const selection = window.getSelection();
                                    if (selection && selection.rangeCount > 0) {
                                        // Execute standard unwrap sequence for color
                                        document.execCommand('foreColor', false, appSettings.theme === 'dark' ? '#E8E8E6' : '#37352F');
                                    }

                                    setCurrentTextColor('inherit');
                                }} className="h-7 px-2 rounded hover:bg-[#EBEBEA] dark:hover:bg-[#404040] flex items-center justify-center text-[#787774] dark:text-[#989895] hover:text-[#37352F] dark:hover:text-[#E8E8E6] transition-colors text-[11px] uppercase font-bold tracking-wider shrink-0 ml-1" title="Limpar Tudo (Formatação e Cor)">
                                    Limpar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Export Modal */}
                    {exportModalOpen && (
                        <div className="fixed inset-0 bg-black/50 dark:bg-black/60 z-[200] flex justify-center items-center animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-[#191919] w-[400px] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-[#EBEBEA] dark:border-[#2F2F2F]">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEA] dark:border-[#2F2F2F]">
                                    <h2 className="text-[16px] font-semibold text-[#37352F] dark:text-[#E8E8E6] flex items-center gap-2">
                                        <Share size={18} />
                                        Exportar Arquivo
                                    </h2>
                                    <button onClick={() => setExportModalOpen(false)} className="text-[#989895] hover:text-[#37352F] dark:hover:text-[#E8E8E6] transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13px] font-medium text-[#787774] dark:text-[#989895]">Nome do Arquivo</label>
                                        <input
                                            type="text"
                                            value={exportData.filename}
                                            onChange={(e) => setExportData({ ...exportData, filename: e.target.value })}
                                            className="w-full bg-[#FBFBFA] dark:bg-[#2F2F2F] border border-[#EBEBEA] dark:border-[#404040] rounded-md px-3 py-2 text-[14px] text-[#37352F] dark:text-[#E8E8E6] outline-none focus:border-[#C0BFB8] dark:focus:border-[#505050] transition-colors"
                                            placeholder="Meu documento"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[13px] font-medium text-[#787774] dark:text-[#989895]">Formato</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['pdf', 'txt', 'word'].map((format) => (
                                                <button
                                                    key={format}
                                                    onClick={() => setExportData({ ...exportData, format })}
                                                    className={`flex items-center justify-center py-2 px-3 border rounded-md text-[13px] font-medium transition-colors ${exportData.format === format
                                                        ? 'border-[#37352F] dark:border-[#E8E8E6] bg-[#37352F]/5 dark:bg-[#E8E8E6]/10 text-[#37352F] dark:text-[#E8E8E6]'
                                                        : 'border-[#EBEBEA] dark:border-[#404040] text-[#787774] dark:text-[#989895] hover:bg-[#FBFBFA] dark:hover:bg-[#2F2F2F]'
                                                        }`}
                                                >
                                                    {format.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-[#FBFBFA] dark:bg-[#202020] border-t border-[#EBEBEA] dark:border-[#2F2F2F] flex justify-end gap-3">
                                    <button
                                        onClick={() => setExportModalOpen(false)}
                                        className="px-4 py-2 text-[14px] font-medium text-[#787774] dark:text-[#989895] hover:text-[#37352F] dark:hover:text-[#E8E8E6] transition-colors rounded-md"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleExportDocument}
                                        className="px-4 py-2 bg-[#37352F] dark:bg-[#E8E8E6] text-white dark:text-[#191919] text-[14px] font-medium rounded-md hover:opacity-90 transition-opacity"
                                    >
                                        Exportar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
