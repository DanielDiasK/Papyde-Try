import React from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = React.memo(() => {
    const minimize = () => window.electronAPI?.windowMinimize();
    const maximize = () => window.electronAPI?.windowMaximize();
    const close = () => window.electronAPI?.windowClose();

    return (
        <div
            className="h-[38px] w-full bg-[#FBFBFA] border-b border-[#EBEBEA] flex items-center justify-between px-4 shrink-0 select-none"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            {/* App Name */}
            <div className="flex items-center gap-2 titlebar-no-drag">
                <div className="w-4 h-4 rounded-[4px] bg-[#37352F] flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">P</span>
                </div>
                <span className="text-[13px] font-semibold text-[#37352F] tracking-tight">Papyde</span>
            </div>

            {/* Spacer */}
            <div />

            {/* Window Controls */}
            <div
                className="flex items-center gap-1"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <button
                    onClick={minimize}
                    className="w-8 h-7 rounded flex items-center justify-center text-[#989895] hover:bg-[#EBEBEA] hover:text-[#37352F] transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={maximize}
                    className="w-8 h-7 rounded flex items-center justify-center text-[#989895] hover:bg-[#EBEBEA] hover:text-[#37352F] transition-colors"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={close}
                    className="w-8 h-7 rounded flex items-center justify-center text-[#989895] hover:bg-red-500 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
});

export default TitleBar;
