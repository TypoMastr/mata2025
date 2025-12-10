
import React from 'react';
import type { View } from '../types';

interface BottomNavProps {
    currentView: View;
    setView: (view: View) => void;
}

const NavItem: React.FC<{ 
    icon: React.ReactElement; 
    label: string; 
    isActive: boolean; 
    onClick: () => void 
}> = ({ icon, label, isActive, onClick }) => {
    return (
        <button 
            onClick={onClick} 
            className="group relative flex flex-col items-center justify-center flex-1 h-full select-none touch-manipulation outline-none active:scale-95 transition-transform duration-200"
        >
            {/* Full Button Background (The Green Pill) */}
            {/* Changed inset-y-1 to inset-y-0.5 to increase height */}
            <span className={`
                absolute inset-x-1 inset-y-0.5 rounded-2xl transition-all duration-300 ease-out
                ${isActive ? 'bg-green-100 opacity-100 scale-100' : 'opacity-0 scale-90'}
            `}></span>

            {/* Content Container - Centered on top of background */}
            <div className={`
                relative z-10 flex flex-col items-center justify-center transition-all duration-300
                ${isActive ? '-translate-y-0.5 gap-0.5' : 'translate-y-0 gap-0'}
            `}>
                {/* Icon */}
                <div className={`
                    w-6 h-6 transition-all duration-300
                    ${isActive ? 'text-green-700 stroke-[2.5px]' : 'text-zinc-400 group-hover:text-zinc-600 stroke-[1.5px]'}
                `}>
                    {icon}
                </div>
                
                {/* Label - Reveals underneath */}
                <span className={`
                    text-[10px] font-bold tracking-tight transition-all duration-300 overflow-hidden whitespace-nowrap
                    ${isActive ? 'text-green-800 max-h-4 opacity-100' : 'max-h-0 opacity-0'}
                `}>
                    {label}
                </span>
            </div>
        </button>
    );
};

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
    const managementViews: View[] = ['management', 'peopleManagement', 'history'];
    
    // Logic to determine active tab based on current view
    const isCadastroActive = !['reports', 'info', ...managementViews].includes(currentView);
    const isReportsActive = currentView === 'reports';
    const isInfoActive = currentView === 'info';
    const isManagementActive = managementViews.includes(currentView);

    // Icons (Heroicons Outline optimized for stroke manipulation)
    const Icons = {
        Users: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
        Chart: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>,
        Adjustments: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>,
        Info: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" /></svg>
    };

    return (
        <div 
            className="fixed left-0 right-0 z-50 pointer-events-none flex justify-center px-4"
            style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >
            <nav className="pointer-events-auto w-full max-w-sm bg-white/90 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl flex justify-between items-center p-1.5 relative overflow-hidden ring-1 ring-black/5 h-16">
                {/* Subtle shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-white/0 to-white/40 pointer-events-none opacity-50"></div>
                
                <NavItem icon={Icons.Users} label="Início" isActive={isCadastroActive} onClick={() => setView('list')} />
                <NavItem icon={Icons.Chart} label="Relatórios" isActive={isReportsActive} onClick={() => setView('reports')} />
                <NavItem icon={Icons.Adjustments} label="Gestão" isActive={isManagementActive} onClick={() => setView('management')} />
                <NavItem icon={Icons.Info} label="Info" isActive={isInfoActive} onClick={() => setView('info')} />
            </nav>
        </div>
    );
};

export default BottomNav;
