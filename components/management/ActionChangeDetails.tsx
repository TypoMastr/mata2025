import React from 'react';

interface ActionChangeDetailsProps {
    previousData: any | null;
    newData: any | null;
}

const IGNORED_KEYS = ['id', 'created_at', 'registrationDate', 'person_id', 'eventId', 'is_undone', 'ip_address', 'location_info', 'action_type', 'record_id', 'table_name', 'description', 'person', 'people', 'is_deleted'];


const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === '') return 'Vazio';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    
    const keyLower = key.toLowerCase();
    if ((keyLower.includes('date') || keyLower.includes('at') || keyLower.includes('deadline')) && typeof value === 'string' && !isNaN(new Date(value).getTime())) {
        try {
             return new Date(value).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'UTC'
             });
        } catch {
            return value;
        }
    }
    if ((keyLower.includes('amount') || keyLower.includes('price')) && typeof value === 'number') {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
};


const DiffRow: React.FC<{ field: string; before: any; after: any }> = ({ field, before, after }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-2 py-2 border-b border-zinc-100 last:border-b-0">
        <span className="font-semibold text-zinc-600 text-xs md:text-sm truncate" title={field}>{field}</span>
        <span className="text-red-600 line-through text-xs md:text-sm break-words bg-red-50 p-1 rounded-md md:bg-transparent md:p-0">
            <span className="md:hidden font-bold">Antes: </span>{formatValue(field, before)}
        </span>
        <span className="text-green-600 text-xs md:text-sm break-words bg-green-50 p-1 rounded-md md:bg-transparent md:p-0">
            <span className="md:hidden font-bold">Depois: </span>{formatValue(field, after)}
        </span>
    </div>
);

const DetailRow: React.FC<{ field: string; value: any; colorClass?: string }> = ({ field, value, colorClass = 'text-zinc-800' }) => (
    <div className="grid grid-cols-2 gap-2 text-xs py-1.5 border-b border-zinc-100 last:border-b-0">
        <span className="font-semibold text-zinc-600">{field}</span>
        <span className={`${colorClass} break-words`}>{formatValue(field, value)}</span>
    </div>
);

const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
        'name': 'Nome',
        'person.name': 'Nome',
        'document': 'Documento',
        'person.document': 'Documento',
        'documentType': 'Tipo de Documento',
        'person.documentType': 'Tipo de Documento',
        'phone': 'Telefone',
        'person.phone': 'Telefone',
        'packageType': 'Pacote',
        'notes': 'Observações',
        'busNumber': 'Número do Ônibus',
        'payment.amount': 'Valor do Pagamento',
        'payment.status': 'Status do Pagamento',
        'payment.date': 'Data Pag.',
        'payment.type': 'Tipo Pag.',
        'payment.receiptUrl': 'URL Comprovante',
        'payment.sitePaymentDetails.isPaid': 'Sítio Pago',
        'payment.sitePaymentDetails.date': 'Data Sítio',
        'payment.sitePaymentDetails.type': 'Tipo Sítio',
        'payment.busPaymentDetails.isPaid': 'Ônibus Pago',
        'payment.busPaymentDetails.date': 'Data Ônibus',
        'payment.busPaymentDetails.type': 'Tipo Ônibus',
        'is_deleted': 'Excluído',
        'event_date': 'Data do Evento',
        'location': 'Local',
        'site_price': 'Preço Sítio',
        'bus_price': 'Preço Ônibus',
        'pix_key': 'Chave PIX',
        'activity_time': 'Horário Atividades',
        'bus_departure_time': 'Horário Saída Ônibus',
        'bus_return_time': 'Horário Retorno Ônibus',
        'payment_deadline': 'Prazo Pagamento',
    };
    return labels[key] || key;
};

const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
    if (!obj || typeof obj !== 'object') {
        return {};
    }
    return Object.keys(obj).reduce((acc, k) => {
        if (IGNORED_KEYS.includes(k)) return acc;

        const pre = prefix.length ? prefix + '.' : '';
        const newKey = pre + k;
        
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], newKey));
        } else {
            acc[newKey] = obj[k];
        }
        return acc;
    }, {} as Record<string, any>);
};


const ActionChangeDetails: React.FC<ActionChangeDetailsProps> = ({ previousData, newData }) => {
    
    if (!previousData && !newData) {
        return <p className="text-sm text-zinc-500 text-center py-4">Nenhum detalhe de alteração disponível.</p>;
    }

    // CREATE action
    if (!previousData && newData) {
        const flatNew = flattenObject(newData);
        if (Object.keys(flatNew).length === 0) return <p className="text-sm text-zinc-500 text-center py-4">Nenhum dado para exibir.</p>;

        return (
            <div>
                <h4 className="text-base font-bold text-green-700 mb-2">Dados Criados</h4>
                {Object.entries(flatNew).map(([key, value]) => (
                    <DetailRow key={key} field={getFieldLabel(key)} value={value} colorClass="text-green-700" />
                ))}
            </div>
        );
    }

    // DELETE action
    if (previousData && (!newData || newData.is_deleted)) {
        const flatOld = flattenObject(previousData);
        if (Object.keys(flatOld).length === 0) return <p className="text-sm text-zinc-500 text-center py-4">Nenhum dado para exibir.</p>;

         return (
            <div>
                <h4 className="text-base font-bold text-red-700 mb-2">Dados Excluídos</h4>
                {Object.entries(flatOld).map(([key, value]) => (
                    <DetailRow key={key} field={getFieldLabel(key)} value={value} colorClass="text-red-700 line-through" />
                ))}
            </div>
        );
    }
    
    // UPDATE action
    if (previousData && newData) {
        const flatOld = flattenObject(previousData);
        const flatNew = flattenObject(newData);
        const allKeys = [...new Set([...Object.keys(flatOld), ...Object.keys(flatNew)])];
        
        const changes = allKeys.filter(key => {
            return JSON.stringify(flatOld[key]) !== JSON.stringify(flatNew[key]);
        });

        if (changes.length === 0) {
            return <p className="text-sm text-zinc-500 text-center py-4">Nenhuma alteração de dados detectada.</p>;
        }

        return (
            <div>
                <h4 className="text-base font-bold text-blue-700 mb-2">Alterações</h4>
                <div className="hidden md:grid md:grid-cols-3 gap-2 text-xs font-bold text-zinc-500 mb-1 px-1">
                    <span>Campo</span>
                    <span>Antes</span>
                    <span>Depois</span>
                </div>
                {changes.map(key => (
                     <DiffRow key={key} field={getFieldLabel(key)} before={flatOld[key]} after={flatNew[key]} />
                ))}
            </div>
        );
    }

    return null;
};

export default ActionChangeDetails;
