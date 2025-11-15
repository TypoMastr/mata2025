import React from 'react';
import type { View } from '../types';

interface SideNavProps {
    currentView: View;
    setView: (view: View) => void;
}

const NavItem: React.FC<{ icon: React.ReactElement; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => {
    const baseClasses = "flex items-center w-full p-3 rounded-lg transition-colors";
    const activeClasses = 'bg-green-100 text-green-700 font-bold';
    const inactiveClasses = 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900';

    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {icon}
            <span>{label}</span>
        </button>
    );
};


const SideNav: React.FC<SideNavProps> = ({ currentView, setView }) => {
    const isCadastroActive = !['reports', 'info', 'management'].includes(currentView);
    const isReportsActive = currentView === 'reports';
    const isManagementActive = currentView === 'management';
    const isInfoActive = currentView === 'info';

    const IconUsers = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    const IconChart = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
    const IconInfo = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    const IconCog = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

    return (
        <aside className="hidden md:block w-64 bg-white/60 border-r border-zinc-200 p-4 flex-shrink-0">
             <div className="flex items-center gap-2 mb-8">
                <img src="https://cdn-icons-png.flaticon.com/512/284/284471.png" alt="Logo" className="h-10 w-10"/>
                <div className="flex flex-col">
                    <span className="font-bold text-lg text-zinc-800">Gira da Mata</span>
                    <span className="text-xs text-zinc-500">Painel de Controle</span>
                </div>
            </div>
            <nav className="space-y-2">
                <NavItem icon={IconUsers} label="Inscrições" isActive={isCadastroActive} onClick={() => setView('list')} />
                <NavItem icon={IconChart} label="Relatórios" isActive={isReportsActive} onClick={() => setView('reports')} />
                <NavItem icon={IconCog} label="Gestão de Eventos" isActive={isManagementActive} onClick={() => setView('management')} />
                <NavItem icon={IconInfo} label="Informações" isActive={isInfoActive} onClick={() => setView('info')} />
            </nav>
        </aside>
    );
};

export default SideNav;
