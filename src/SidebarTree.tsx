import React, { useState, useRef } from 'react';
import { FileText, Folder, FolderOpen, Trash2, ChevronRight, Pencil } from 'lucide-react';
import { cn } from './lib/utils';

export type SidebarItem = {
    id: string;
    type: 'folder' | 'document';
    name: string;
    docId?: string;
    parentId: string | null;
    order: number;
    isOpen?: boolean;
};

interface Props {
    items: SidebarItem[];
    activeDocId: string | null;
    onSelectDoc: (docId: string) => void;
    onDeleteItem: (id: string) => void;
    onToggleFolder: (id: string) => void;
    onReorder: (newItems: SidebarItem[]) => void;
    onRenameItem?: (id: string, newName: string) => void;
}

interface TreeNode extends SidebarItem {
    children: TreeNode[];
}

function buildTree(items: SidebarItem[], parentId: string | null = null): TreeNode[] {
    return items
        .filter(i => i.parentId === parentId)
        .sort((a, b) => a.order - b.order)
        .map(i => ({ ...i, children: buildTree(items, i.id) }));
}

const SidebarTree = React.memo(({ items, activeDocId, onSelectDoc, onDeleteItem, onToggleFolder, onReorder, onRenameItem }: Props) => {
    const tree = React.useMemo(() => buildTree(items), [items]);

    return (
        <div className="flex flex-col gap-[1px]">
            {tree.map(node => (
                <SidebarNode
                    key={node.id}
                    node={node}
                    depth={0}
                    items={items}
                    activeDocId={activeDocId}
                    onSelectDoc={onSelectDoc}
                    onDeleteItem={onDeleteItem}
                    onToggleFolder={onToggleFolder}
                    onReorder={onReorder}
                    onRenameItem={onRenameItem}
                />
            ))}
        </div>
    );
});

export default SidebarTree;

interface NodeProps {
    node: TreeNode;
    depth: number;
    items: SidebarItem[];
    activeDocId: string | null;
    onSelectDoc: (docId: string) => void;
    onDeleteItem: (id: string) => void;
    onToggleFolder: (id: string) => void;
    onReorder: (newItems: SidebarItem[]) => void;
    onRenameItem?: (id: string, newName: string) => void;
}

const SidebarNode = React.memo(({ node, depth, items, activeDocId, onSelectDoc, onDeleteItem, onToggleFolder, onReorder, onRenameItem }: NodeProps) => {
    const [dragOver, setDragOver] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(node.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const isActiveDoc = node.type === 'document' && node.docId === activeDocId;

    const startRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRenameVal(node.name);
        setRenaming(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const commitRename = () => {
        const trimmed = renameVal.trim();
        setRenaming(false);
        if (trimmed && trimmed !== node.name) {
            onRenameItem?.(node.id, trimmed);
        }
    };

    const handleRenameKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitRename();
        if (e.key === 'Escape') { setRenaming(false); setRenameVal(node.name); }
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', node.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (node.type === 'folder') setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === node.id) return;
        if (node.type !== 'folder') return;
        const updated = items.map(i =>
            i.id === draggedId ? { ...i, parentId: node.id, order: Date.now() } : i
        );
        onReorder(updated);
    };

    const handleDropOnGap = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId) return;
        const updated = items.map(i =>
            i.id === draggedId ? { ...i, parentId: node.parentId, order: node.order - 0.5 } : i
        );
        const siblings = updated
            .filter(i => i.parentId === node.parentId)
            .sort((a, b) => a.order - b.order)
            .map((i, idx) => ({ ...i, order: idx }));
        const final = updated.map(i => siblings.find(s => s.id === i.id) ?? i);
        onReorder(final);
    };

    return (
        <div>
            {/* Drop gap above */}
            <div
                className="h-1 w-full"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDropOnGap}
            />

            <div
                draggable={!renaming}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-[4px] text-[14px] transition-colors cursor-pointer group relative select-none',
                    isActiveDoc ? 'bg-[#EBEBEA] text-[#37352F] font-medium' : 'text-[#787774] hover:bg-[#EBEBEA] hover:text-[#37352F]',
                    dragOver && 'bg-[#E4E4E3] ring-1 ring-[#C7C7C5]'
                )}
                style={{ paddingLeft: `${(depth * 12) + 8}px` }}
                onClick={() => {
                    if (renaming) return;
                    if (node.type === 'document' && node.docId) onSelectDoc(node.docId);
                    if (node.type === 'folder') onToggleFolder(node.id);
                }}
            >
                {node.type === 'folder' && (
                    <ChevronRight
                        size={12}
                        className={cn('text-[#989895] shrink-0 transition-transform', node.isOpen && 'rotate-90')}
                    />
                )}

                {node.type === 'folder' ? (
                    node.isOpen
                        ? <FolderOpen size={16} className="text-[#787774] shrink-0 group-hover:text-[#37352F]" />
                        : <Folder size={16} className="text-[#787774] shrink-0 group-hover:text-[#37352F]" />
                ) : (
                    <FileText size={16} className={cn('shrink-0', isActiveDoc ? 'text-[#37352F]' : 'text-[#989895] group-hover:text-[#37352F]')} />
                )}

                {renaming && node.type === 'folder' ? (
                    <input
                        ref={inputRef}
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleRenameKey}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-white border border-[#37352F] rounded px-1.5 py-0.5 text-[13px] text-[#37352F] outline-none shadow-sm"
                    />
                ) : (
                    <span className="truncate flex-1 text-[14px]">{node.name || 'Sem título'}</span>
                )}

                {/* Actions visible on hover */}
                <div className={cn('flex items-center gap-0.5 transition-all ml-auto shrink-0', renaming ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                    {node.type === 'folder' && !renaming && (
                        <button
                            onClick={startRename}
                            className="hover:bg-[#E1E1E0] p-[3px] rounded-sm transition-colors"
                            title="Renomear pasta"
                        >
                            <Pencil size={12} className="text-[#989895] hover:text-[#37352F]" />
                        </button>
                    )}
                    {!renaming && (
                        <button
                            onClick={e => { e.stopPropagation(); onDeleteItem(node.id); }}
                            className="hover:bg-[#E1E1E0] p-[3px] rounded-sm transition-colors"
                            title="Excluir"
                        >
                            <Trash2 size={12} className="text-[#989895] hover:text-red-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* Children (if folder open) */}
            {node.type === 'folder' && node.isOpen && node.children.length > 0 && (
                <div>
                    {node.children.map(child => (
                        <SidebarNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            items={items}
                            activeDocId={activeDocId}
                            onSelectDoc={onSelectDoc}
                            onDeleteItem={onDeleteItem}
                            onToggleFolder={onToggleFolder}
                            onReorder={onReorder}
                            onRenameItem={onRenameItem}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});
