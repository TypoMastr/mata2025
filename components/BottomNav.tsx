import React from 'react';
import type { View } from '../types';

interface BottomNavProps {
    currentView: View;
    setView: (view: View) => void;
}

const NavItem: React.FC<{ icon: React.ReactElement; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => {
    const activeClasses = 'text-green-500';
    const inactiveClasses = 'text-zinc-500 hover:text-green-500';

    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 w-full transition-colors ${isActive ? activeClasses : inactiveClasses}`}>
            {/* FIX: Removed React.cloneElement to avoid typing errors. The className is now on the SVG definition. */}
            {icon}
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
};


const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView }) => {
    const isCadastroActive = !['reports', 'info'].includes(currentView);
    const isReportsActive = currentView === 'reports';
    const isInfoActive = currentView === 'info';

    // FIX: Added className to SVG elements to avoid using React.cloneElement.
    const IconUsers = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
    const IconChart = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
    const IconInfo = <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;


    return (
        <footer
            className="fixed bottom-0 left-0 right-0 h-20 bg-white/95 border-t border-zinc-200 shadow-t-xl max-w-lg mx-auto md:hidden"
            style={{ transform: 'translateZ(0)' }}
        >
            <div className="flex justify-around items-stretch h-full">
                <NavItem icon={IconUsers} label="Inscrições" isActive={isCadastroActive} onClick={() => setView('list')} />
                <NavItem icon={IconChart} label="Relatórios" isActive={isReportsActive} onClick={() => setView('reports')} />
                <NavItem icon={IconInfo} label="Informações" isActive={isInfoActive} onClick={() => setView('info')} />
            </div>
        </footer>
    );
};

export default BottomNav;
