
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
    
    const addBusDiscountPriceSql = (): string => {
        return `-- Adiciona o valor promocional do ônibus à tabela 'events'
ALTER TABLE public.events
ADD COLUMN bus_discount_price NUMERIC NOT NULL DEFAULT 40;`;
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

    const busCapacityAssignmentSql = (): string => "BEGIN;\nLOCK TABLE public.event_registrations IN ACCESS EXCLUSIVE MODE;\n\n-- Remove os gatilhos antes da correção inicial; a migração pode ser executada novamente.\nDROP TRIGGER IF EXISTS event_registrations_assign_bus_insert ON public.event_registrations;\nDROP TRIGGER IF EXISTS event_registrations_assign_bus_update ON public.event_registrations;\n\nALTER TABLE public.event_registrations\n    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;\nALTER TABLE public.event_registrations\n    ADD COLUMN IF NOT EXISTS wont_attend BOOLEAN DEFAULT FALSE;\n\n-- Redistribui registros ativos atuais em grupos de até 50, por evento.\nWITH ranked_bus_passengers AS (\n    SELECT id,\n        ((ROW_NUMBER() OVER (\n            PARTITION BY event_id\n            ORDER BY bus_number ASC NULLS LAST, registration_date ASC NULLS LAST, id ASC\n        ) - 1) / 50 + 1)::INTEGER AS assigned_bus_number\n    FROM public.event_registrations\n    WHERE COALESCE(is_deleted, FALSE) = FALSE\n      AND COALESCE(wont_attend, FALSE) = FALSE\n      AND package_type <> 'Apenas Sítio'\n)\nUPDATE public.event_registrations AS registration\n   SET bus_number = ranked_bus_passengers.assigned_bus_number\n  FROM ranked_bus_passengers\n WHERE registration.id = ranked_bus_passengers.id;\n\nUPDATE public.event_registrations\n   SET bus_number = NULL\n WHERE COALESCE(is_deleted, FALSE) = FALSE\n   AND (COALESCE(wont_attend, FALSE) = TRUE OR package_type = 'Apenas Sítio');\n\n-- Contador transacional por ônibus: o UPSERT é a reserva atômica da vaga.\nCREATE TABLE IF NOT EXISTS public.event_bus_capacity (\n    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,\n    bus_number INTEGER NOT NULL CHECK (bus_number > 0),\n    passenger_count INTEGER NOT NULL CHECK (passenger_count BETWEEN 0 AND 50),\n    PRIMARY KEY (event_id, bus_number)\n);\nDELETE FROM public.event_bus_capacity;\nINSERT INTO public.event_bus_capacity (event_id, bus_number, passenger_count)\nSELECT event_id, bus_number, COUNT(*)::INTEGER\n  FROM public.event_registrations\n WHERE COALESCE(is_deleted, FALSE) = FALSE\n   AND COALESCE(wont_attend, FALSE) = FALSE\n   AND package_type <> 'Apenas Sítio'\n   AND bus_number IS NOT NULL\n GROUP BY event_id, bus_number;\nREVOKE ALL ON TABLE public.event_bus_capacity FROM PUBLIC, anon, authenticated;\n\nCREATE OR REPLACE FUNCTION public.allocate_event_bus_seat(p_event_id UUID)\nRETURNS INTEGER\nLANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path = pg_catalog, public, pg_temp\nAS $function$\nDECLARE\n    candidate_bus INTEGER := 1;\n    assigned_bus INTEGER;\nBEGIN\n    LOOP\n        assigned_bus := NULL;\n        INSERT INTO public.event_bus_capacity (event_id, bus_number, passenger_count)\n        VALUES (p_event_id, candidate_bus, 1)\n        ON CONFLICT (event_id, bus_number) DO UPDATE\n            SET passenger_count = event_bus_capacity.passenger_count + 1\n            WHERE event_bus_capacity.passenger_count < 50\n        RETURNING bus_number INTO assigned_bus;\n\n        IF FOUND THEN\n            RETURN assigned_bus;\n        END IF;\n\n        candidate_bus := candidate_bus + 1;\n    END LOOP;\nEND;\n$function$;\nREVOKE ALL ON FUNCTION public.allocate_event_bus_seat(UUID) FROM PUBLIC, anon, authenticated;\n\nCREATE OR REPLACE FUNCTION public.assign_event_registration_bus()\nRETURNS trigger\nLANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path = pg_catalog, public, pg_temp\nAS $function$\nDECLARE\n    old_is_bus_passenger BOOLEAN;\n    new_is_bus_passenger BOOLEAN;\n    requested_bus INTEGER;\n    assigned_bus INTEGER;\nBEGIN\n    IF TG_OP = 'INSERT' THEN\n        new_is_bus_passenger := COALESCE(NEW.is_deleted, FALSE) = FALSE\n            AND COALESCE(NEW.wont_attend, FALSE) = FALSE\n            AND NEW.package_type <> 'Apenas Sítio';\n        IF new_is_bus_passenger THEN\n            NEW.bus_number := public.allocate_event_bus_seat(NEW.event_id);\n        ELSE\n            NEW.bus_number := NULL;\n        END IF;\n        RETURN NEW;\n    END IF;\n\n    old_is_bus_passenger := COALESCE(OLD.is_deleted, FALSE) = FALSE\n        AND COALESCE(OLD.wont_attend, FALSE) = FALSE\n        AND OLD.package_type <> 'Apenas Sítio';\n    new_is_bus_passenger := COALESCE(NEW.is_deleted, FALSE) = FALSE\n        AND COALESCE(NEW.wont_attend, FALSE) = FALSE\n        AND NEW.package_type <> 'Apenas Sítio';\n\n    -- Atualizações sem mudança de ônibus mantêm a vaga já reservada.\n    IF old_is_bus_passenger AND new_is_bus_passenger\n       AND OLD.event_id IS NOT DISTINCT FROM NEW.event_id\n       AND OLD.bus_number IS NOT DISTINCT FROM NEW.bus_number THEN\n        RETURN NEW;\n    END IF;\n\n    IF old_is_bus_passenger AND OLD.bus_number IS NOT NULL\n       AND (NOT new_is_bus_passenger\n            OR OLD.event_id IS DISTINCT FROM NEW.event_id\n            OR OLD.bus_number IS DISTINCT FROM NEW.bus_number) THEN\n        UPDATE public.event_bus_capacity\n           SET passenger_count = passenger_count - 1\n         WHERE event_id = OLD.event_id\n           AND bus_number = OLD.bus_number\n           AND passenger_count > 0;\n    END IF;\n\n    IF NOT new_is_bus_passenger THEN\n        IF COALESCE(NEW.is_deleted, FALSE) = FALSE THEN\n            NEW.bus_number := NULL;\n        END IF;\n        RETURN NEW;\n    END IF;\n\n    -- Mudança manual de ônibus: reserva a vaga escolhida ou rejeita se lotado.\n    IF old_is_bus_passenger\n       AND OLD.event_id IS NOT DISTINCT FROM NEW.event_id\n       AND OLD.package_type IS NOT DISTINCT FROM NEW.package_type\n       AND OLD.is_deleted IS NOT DISTINCT FROM NEW.is_deleted\n       AND OLD.wont_attend IS NOT DISTINCT FROM NEW.wont_attend\n       AND OLD.bus_number IS DISTINCT FROM NEW.bus_number THEN\n        requested_bus := NEW.bus_number;\n        IF requested_bus IS NULL THEN\n            RETURN NEW;\n        END IF;\n\n        INSERT INTO public.event_bus_capacity (event_id, bus_number, passenger_count)\n        VALUES (NEW.event_id, requested_bus, 1)\n        ON CONFLICT (event_id, bus_number) DO UPDATE\n            SET passenger_count = event_bus_capacity.passenger_count + 1\n            WHERE event_bus_capacity.passenger_count < 50\n        RETURNING bus_number INTO assigned_bus;\n\n        IF NOT FOUND THEN\n            RAISE EXCEPTION 'BUS_FULL' USING ERRCODE = '23514';\n        END IF;\n        NEW.bus_number := assigned_bus;\n        RETURN NEW;\n    END IF;\n\n    -- Nova inscrição, restauração ou volta à lista de passageiros.\n    NEW.bus_number := public.allocate_event_bus_seat(NEW.event_id);\n    RETURN NEW;\nEND;\n$function$;\nREVOKE ALL ON FUNCTION public.assign_event_registration_bus() FROM PUBLIC, anon, authenticated;\n\nCREATE TRIGGER event_registrations_assign_bus_insert\nBEFORE INSERT ON public.event_registrations\nFOR EACH ROW EXECUTE FUNCTION public.assign_event_registration_bus();\nCREATE TRIGGER event_registrations_assign_bus_update\nBEFORE UPDATE OF bus_number, is_deleted, event_id, package_type, wont_attend\nON public.event_registrations\nFOR EACH ROW EXECUTE FUNCTION public.assign_event_registration_bus();\n\n-- Marcador para o app detectar se a migração foi aplicada.\nCREATE OR REPLACE FUNCTION public.bus_assignment_migration_check()\nRETURNS BOOLEAN LANGUAGE SQL IMMUTABLE\nAS $function$ SELECT TRUE; $function$;\nGRANT EXECUTE ON FUNCTION public.bus_assignment_migration_check() TO anon, authenticated;\nNOTIFY pgrst, 'reload schema';\nCOMMIT;";

    missingItems.forEach(item => {
        if (item.startsWith('table:')) {
            const tableName = item.split(':')[1];
            commands.push(createTableSql(tableName));
        } else if (item === 'column:bus_discount_price:events') {
            commands.push(addBusDiscountPriceSql());
        } else if (item === 'column:wont_attend:event_registrations') {
            commands.push(addWontAttendSql());
        } else if (item === 'column:actor:action_history') {
            commands.push(addActorSql());
        } else if (item === 'feature:bus_capacity_assignment') {
            commands.push(busCapacityAssignmentSql());
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
                    {missingIn.includes('feature:bus_capacity_assignment') && (
                        <li>Regra automática de lotação dos ônibus (máximo de 50 pessoas) ainda não instalada</li>
                    )}
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
