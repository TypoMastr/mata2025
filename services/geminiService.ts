import { GoogleGenAI } from "@google/genai";
import type { Attendee } from '../types';
import { PackageType, PaymentStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface BusInfo {
    busNumber: number;
    filledSeats: number;
    capacity: number;
}

export const generateReport = async (attendees: Attendee[], buses: BusInfo[]): Promise<string> => {
    const model = 'gemini-2.5-flash';

    const totalAttendees = attendees.length;
    const paidCount = attendees.filter(a => a.payment.status === PaymentStatus.PAGO).length;
    const pendingCount = totalAttendees - paidCount;
    const totalRevenue = attendees.filter(a => a.payment.status === PaymentStatus.PAGO).reduce((sum, a) => sum + a.payment.amount, 0);
    const pendingRevenue = attendees.filter(a => a.payment.status === PaymentStatus.PENDENTE).reduce((sum, a) => sum + a.payment.amount, 0);
    const busAttendeesCount = attendees.filter(a => a.packageType === PackageType.SITIO_BUS).length;

    const busDataForPrompt = buses.length > 0
        ? buses.map(bus => ` - Ônibus ${bus.busNumber}: ${bus.filledSeats} de ${bus.capacity} vagas preenchidas.`).join('\n')
        : "Nenhum participante com pacote de ônibus ainda.";

    const totalPossibleRevenue = totalRevenue + pendingRevenue;

    const prompt = `
        Você é um assistente de organização de eventos. Sua tarefa é gerar um resumo objetivo e claro sobre a situação do evento "Gira da Mata 2025" com base nos dados abaixo. A formatação deve ser otimizada para leitura rápida em telas pequenas, usando títulos e listas.

        **Dados:**
        - **Inscrições:** ${totalAttendees} no total (${paidCount} pagas, ${pendingCount} pendentes).
        - **Financeiro:** R$ ${totalRevenue.toFixed(2)} arrecadados de um potencial de R$ ${totalPossibleRevenue.toFixed(2)}.
        - **Ônibus:** ${busAttendeesCount} passageiros confirmados.
        ${busDataForPrompt}

        **Análise Rápida:**
        Gere um relatório conciso com as seções "**Inscrições**", "**Financeiro**" e "**Logística**". Para cada seção, use 1 ou 2 pontos (bullet points, iniciados com '*') para destacar os insights mais importantes e pontos de atenção. Seja direto e evite texto desnecessário.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating report with Gemini API:", error);
        return "Ocorreu um erro ao gerar o relatório. Por favor, tente novamente mais tarde.";
    }
};