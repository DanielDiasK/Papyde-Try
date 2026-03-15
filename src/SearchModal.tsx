import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Folder, Plus, X, ArrowRight, Clock } from 'lucide-react';
import { SidebarItem } from './SidebarTree';

interface Document {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    documents: Document[];
    sidebarItems: SidebarItem[];
    onSelectDoc: (docId: string) => void;
    onCreateDoc: () => void;
    onCreateFolder: () => void;
}

const SearchModal = React.memo(({ open, onClose, documents, sidebarItems, onSelectDoc, onCreateDoc, onCreateFolder }: Props) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setQuery('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Split items into categories - memoized
    const { folderItems, docItems } = React.useMemo(() => ({
        folderItems: sidebarItems.filter(i => i.type === 'folder'),
        docItems: sidebarItems.filter(i => i.type === 'document')
    }), [sidebarItems]);

    const getDocTitle = (docId?: string) => {
        if (!docId) return 'Sem título';
        const doc = documents.find(d => d.id === docId);
        return doc?.title || 'Sem título';
    };

    const getParentName = (parentId: string | null) => {
        if (!parentId) return null;
        const folder = sidebarItems.find(i => i.id === parentId);
        return folder?.name || null;
    };

    // Filter results - memoized
    const q = query.toLowerCase().trim();

    const filteredFolders = React.useMemo(() => {
        if (!q) return [];
        return folderItems.filter(f => f.name.toLowerCase().includes(q));
    }, [q, folderItems]);

    const filteredDocs = React.useMemo(() => {
        if (!q) return [];
        // Create a lookup map for faster access O(N) instead of O(N^2)
        const docMap = new Map(documents.map(doc => [doc.id, doc]));
        
        return docItems.filter(d => {
            const doc = d.docId ? docMap.get(d.docId) : null;
            if (!doc) return false;

            const titleMatch = (doc.title || '').toLowerCase().includes(q);
            if (titleMatch) return true;

            const contentMatch = (doc.content || '').toLowerCase().includes(q);
            return contentMatch;
        });
    }, [q, docItems, documents]);

    const hasResults = filteredFolders.length > 0 || filteredDocs.length > 0;

    const handleSelectDoc = (docId: string) => {
        onSelectDoc(docId);
        onClose();
    };

    const handleCreateDoc = () => {
        onCreateDoc();
        onClose();
    };

    const handleCreateFolder = () => {
        onCreateFolder();
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-50 animate-in fade-in duration-150"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[560px] z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="bg-white rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.16)] border border-[#EBEBEA] overflow-hidden">

                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-4 border-b border-[#EBEBEA]">
                        <Search size={18} className="text-[#989895] shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Pesquisar páginas, pastas..."
                            className="flex-1 text-[15px] text-[#37352F] bg-transparent outline-none placeholder:text-[#C0BFB8]"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="w-5 h-5 rounded-full bg-[#EBEBEA] flex items-center justify-center hover:bg-[#E1E1E0] transition-colors"
                            >
                                <X size={11} className="text-[#787774]" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-[12px] text-[#989895] bg-[#FBFBFA] border border-[#EBEBEA] px-2 py-0.5 rounded-[4px] hover:bg-[#EBEBEA] transition-colors"
                        >
                            Esc
                        </button>
                    </div>

                    {/* Body */}
                    <div className="max-h-[380px] overflow-y-auto">

                        {/* --- No query: show quick suggestions --- */}
                        {!q && (
                            <div className="p-3">
                                <p className="text-[11px] font-semibold text-[#989895] uppercase tracking-wider px-2 mb-2">Ações Rápidas</p>

                                <button
                                    onClick={handleCreateDoc}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FBFBFA] border border-transparent hover:border-[#EBEBEA] transition-all group text-left"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#37352F] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                        <Plus size={16} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block text-[14px] font-medium text-[#37352F]">Nova Página</span>
                                        <span className="text-[12px] text-[#989895]">Cria uma nova página em branco</span>
                                    </div>
                                    <ArrowRight size={14} className="text-[#C0BFB8] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                <button
                                    onClick={handleCreateFolder}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FBFBFA] border border-transparent hover:border-[#EBEBEA] transition-all group text-left mt-1"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#FBFBFA] border border-[#EBEBEA] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                        <Folder size={16} className="text-[#787774]" />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="block text-[14px] font-medium text-[#37352F]">Nova Pasta</span>
                                        <span className="text-[12px] text-[#989895]">Organiza suas páginas em uma pasta</span>
                                    </div>
                                    <ArrowRight size={14} className="text-[#C0BFB8] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>

                                {documents.length > 0 && (
                                    <>
                                        <p className="text-[11px] font-semibold text-[#989895] uppercase tracking-wider px-2 mb-2 mt-4">Recentes</p>
                                        {documents.slice(0, 3).map(doc => {
                                            const si = sidebarItems.find(i => i.docId === doc.id);
                                            const parent = si ? getParentName(si.parentId) : null;
                                            return (
                                                <button
                                                    key={doc.id}
                                                    onClick={() => handleSelectDoc(doc.id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#FBFBFA] border border-transparent hover:border-[#EBEBEA] transition-all group"
                                                >
                                                    <div className="w-7 h-7 rounded bg-[#FBFBFA] border border-[#EBEBEA] flex items-center justify-center shrink-0">
                                                        <Clock size={13} className="text-[#989895]" />
                                                    </div>
                                                    <div className="min-w-0 text-left flex-1">
                                                        <span className="block text-[14px] text-[#37352F] truncate">{doc.title || 'Sem título'}</span>
                                                        {parent && <span className="text-[12px] text-[#989895]">{parent}</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </>
                                )}
                            </div>
                        )}

                        {/* --- With query: show results --- */}
                        {q && !hasResults && (
                            <div className="flex flex-col items-center py-10 text-[#989895]">
                                <Search size={28} className="mb-3 opacity-30" />
                                <p className="text-[14px]">Nenhum resultado para "<span className="text-[#37352F]">{query}</span>"</p>
                            </div>
                        )}

                        {q && filteredFolders.length > 0 && (
                            <div className="px-3 pt-3 pb-1">
                                <p className="text-[11px] font-semibold text-[#989895] uppercase tracking-wider px-2 mb-2">Pastas</p>
                                {filteredFolders.map(folder => (
                                    <div
                                        key={folder.id}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#FBFBFA] border border-transparent hover:border-[#EBEBEA] transition-all cursor-default"
                                    >
                                        <div className="w-7 h-7 rounded bg-[#FBFBFA] border border-[#EBEBEA] flex items-center justify-center shrink-0">
                                            <Folder size={14} className="text-[#787774]" />
                                        </div>
                                        <span className="text-[14px] text-[#37352F] truncate">{folder.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {q && filteredDocs.length > 0 && (
                            <div className="px-3 pb-3 pt-1">
                                <p className="text-[11px] font-semibold text-[#989895] uppercase tracking-wider px-2 mb-2">Páginas</p>
                                {filteredDocs.map(item => {
                                    const title = getDocTitle(item.docId);
                                    const parent = getParentName(item.parentId);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => item.docId && handleSelectDoc(item.docId)}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#FBFBFA] border border-transparent hover:border-[#EBEBEA] transition-all group"
                                        >
                                            <div className="w-7 h-7 rounded bg-[#FBFBFA] border border-[#EBEBEA] flex items-center justify-center shrink-0">
                                                <FileText size={13} className="text-[#989895]" />
                                            </div>
                                            <div className="min-w-0 text-left flex-1">
                                                <span className="block text-[14px] text-[#37352F] font-medium truncate">{title}</span>
                                                <span className="text-[12px] text-[#989895]">{parent ? `Em ${parent}` : 'Na raiz'}</span>
                                            </div>
                                            <ArrowRight size={14} className="text-[#C0BFB8] ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
});

export default SearchModal;
