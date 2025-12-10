
import React from 'react';
import { useToast } from '../contexts/ToastContext';

interface DatabaseMigrationProps {
    missingIn: string[];
}

const generateSqlCommands = (missingItems: string[]): string => {
    const commands: string[] = [];

    const createTableSql = (tableName: string): string => {
        if (tableName === 'action_history') {
            return `-- Cria a tabela para o histórico de ações
CREATE TABLE public.action_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    previous_data JSONB,
    new_data JSONB,
    description TEXT NOT NULL,
    actor TEXT,
    ip_address TEXT,
    location_info JSONB,
    is_undone BOOLEAN NOT NULL DEFAULT FALSE
);`;
        }
        if (tableName === 'financial_records') {
            return `-- Cria a tabela para registros financeiros extras
CREATE TABLE public.financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_id UUID NOT NULL REFERENCES public.events(id),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE
);`;
        }
        return `-- Comando para criar a tabela '${tableName}' não definido.`;
    };

    const addColumnSql = (tableName: string): string => {
        return `-- Adiciona a coluna 'is_deleted' à tabela '${tableName}'
ALTER TABLE public.${tableName}
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;`;
    };
    
    const addWontAttendSql = (): string => {
        return `-- Adiciona a coluna 'wont_attend' à tabela 'event_registrations' para marcar quem pagou mas não irá
ALTER TABLE public.event_registrations
ADD COLUMN wont_attend BOOLEAN DEFAULT FALSE;`;
    };
    
    const addActorSql = (): string => {
        return `-- Adiciona a coluna 'actor' à tabela 'action_history' para registrar quem fez a ação
ALTER TABLE public.action_history
ADD COLUMN actor TEXT;`;
    };

    missingItems.forEach(item => {
        if (item.startsWith('table:')) {
            const tableName = item.split(':')[1];
            commands.push(createTableSql(tableName));
        } else if (item === 'column:wont_attend:event_registrations') {
            commands.push(addWontAttendSql());
        } else if (item === 'column:actor:action_history') {
            commands.push(addActorSql());
        } else {
            // Assume it's a table name missing a column
            commands.push(addColumnSql(item));
        }
    });

    return commands.join('\n\n');
};


const DatabaseMigration: React.FC<DatabaseMigrationProps> = ({ missingIn }) => {
    const { addToast } = useToast();
    const sqlCommands = generateSqlCommands(missingIn);

    const handleCopy = () => {
        navigator.clipboard.writeText(sqlCommands).then(() => {
            addToast('Comandos SQL copiados!', 'success');
        }, () => {
            addToast('Falha ao copiar comandos.', 'error');
        });
    };
    
    const missingTables = missingIn.filter(i => i.startsWith('table:')).map(i => i.split(':')[1]);
    const missingColumnsInTables = missingIn.filter(i => !i.startsWith('table:') && !i.startsWith('column:'));
    const specificColumnMissing = missingIn.some(i => i.startsWith('column:'));

    return (
        <div className="bg-zinc-100 flex flex-col items-center justify-center min-h-screen p-4 font-sans text-zinc-800">
            <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-zinc-200">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold">Atualização de Banco de Dados Necessária</h1>
                </div>

                <p className="mb-4 text-zinc-600">
                    O aplicativo foi atualizado e precisa de algumas alterações no banco de dados para funcionar. Foram detectados os seguintes problemas:
                </p>

                <ul className="list-disc list-inside mb-4 text-zinc-600 space-y-1">
                    {missingTables.length > 0 && <li>Tabela(s) faltando: <strong>{missingTables.join(', ')}</strong></li>}
                    {missingColumnsInTables.length > 0 && <li>Coluna <code>is_deleted</code> faltando em: <strong>{missingColumnsInTables.join(', ')}</strong></li>}
                    {specificColumnMissing && <li>Colunas específicas faltando (ex: <code>actor</code>, <code>wont_attend</code>)</li>}
                </ul>

                <p className="mb-4 text-zinc-600">
                    Por favor, execute os seguintes comandos no <strong>Editor SQL</strong> do seu projeto Supabase para resolver o problema.
                </p>

                <div className="bg-zinc-800 text-white rounded-lg p-4 font-mono text-sm overflow-x-auto relative">
                    <pre><code>{sqlCommands}</code></pre>
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 bg-zinc-600 hover:bg-zinc-500 text-white font-semibold py-1 px-2 rounded-md text-xs transition-colors"
                    >
                        Copiar
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full max-w-sm bg-green-500 text-white font-bold py-3 px-4 rounded-full hover:bg-green-600 transition-colors shadow-lg"
                    >
                        Já executei os comandos, Recarregar o App
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseMigration;
