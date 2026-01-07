
import { GnreGuia, CompanyInfo } from '../types';
import { ITAU_BANK_CODE } from '../constants';

const padLeft = (val: string | number, len: number, char = '0'): string => {
  return String(val).padStart(len, char).substring(0, len);
};

const padRight = (val: string | number, len: number, char = ' '): string => {
  return String(val).padEnd(len, char).substring(0, len);
};

const formatDateForCNAB = (dateStr: string): string => {
  return dateStr.replace(/\//g, '');
};

const formatValueForCNAB = (val: number, len: number = 15): string => {
  const numericVal = Math.round(val * 100);
  return padLeft(numericVal, len);
};

export function generateCNAB240(guias: GnreGuia[], company: CompanyInfo): string {
  const now = new Date();
  const dateStr = padLeft(now.getDate(), 2) + padLeft(now.getMonth() + 1, 2) + now.getFullYear();
  const timeStr = "120000"; // Fixed time as per Sample 02
  const records: string[] = [];
  const cnpjClean = company.cnpj.replace(/\D/g, "");

  // Registro 0 - Header de Arquivo
  let r0 = ITAU_BANK_CODE;
  r0 += "0000";
  r0 += "0";
  r0 += padRight("", 6);
  r0 += "080";
  r0 += "2";
  r0 += padLeft(cnpjClean, 14);
  r0 += padRight("", 20);
  r0 += padLeft(company.agency, 5);
  r0 += " ";
  r0 += padLeft(company.account, 12);
  r0 += " ";
  r0 += company.dac;
  r0 += padRight(company.name, 30);
  r0 += padRight("BANCO ITAU S.A.", 30);
  r0 += padRight("", 10);
  r0 += "1";
  r0 += dateStr;
  r0 += timeStr;
  r0 += padLeft(0, 9);
  r0 += "00000";
  r0 += padRight("", 69);
  records.push(r0);

  // Registro 1 - Header de Lote
  let r1 = ITAU_BANK_CODE;
  r1 += "0001";
  r1 += "1";
  r1 += "C";
  r1 += "22";
  r1 += "91";
  r1 += "030";
  r1 += " ";
  r1 += "2";
  r1 += padLeft(cnpjClean, 14);
  r1 += padRight("GNRE", 4);
  r1 += padRight("", 16);
  r1 += padLeft(company.agency, 5);
  r1 += " ";
  r1 += padLeft(company.account, 12);
  r1 += " ";
  r1 += company.dac;
  r1 += padRight(company.name, 30);
  r1 += padRight("", 30);
  r1 += padRight("", 10);
  r1 += padRight("", 30);
  r1 += "00000";
  r1 += padRight("", 15);
  r1 += padRight("", 20);
  r1 += "00000000";
  r1 += "  ";
  r1 += padRight("", 8);
  r1 += padRight("", 10);
  records.push(r1);

  let totalValue = 0;
  let detailCount = 0;

  guias.filter(g => g.status === 'completed').forEach((guia, idx) => {
    totalValue += guia.valor;
    detailCount++;

    const seqStr = padLeft(idx + 1, 5);
    const vencFormatado = formatDateForCNAB(guia.vencimento);
    const seuNumeroRaw = `GNRE-${guia.uf}-${vencFormatado}-${padLeft(idx + 1, 2)}`;
    const seuNumero = padRight(seuNumeroRaw, 20);

    // Registro 3 - Detalhe Segmento O
    let r3 = ITAU_BANK_CODE;
    r3 += "0001";
    r3 += "3";
    r3 += seqStr;
    r3 += "O";
    r3 += "000";
    r3 += padRight(guia.linhaDigitavel, 48);
    r3 += padRight(`GNRE ${guia.uf}`, 30);
    r3 += vencFormatado;
    r3 += "REA";
    r3 += padLeft(0, 15);
    r3 += formatValueForCNAB(guia.valor, 15);
    r3 += vencFormatado;
    r3 += padLeft(0, 15); // Valor Pago (Zeros as per Sample 02)
    r3 += padRight("", 3);
    r3 += padLeft(0, 9);
    r3 += padRight("", 3);
    r3 += seuNumero;
    r3 += padRight("", 21);
    r3 += padRight("", 15);
    r3 += padRight("", 10);
    records.push(r3);
  });

  // Registro 5 - Trailer de Lote
  let r5 = ITAU_BANK_CODE;
  r5 += "0001";
  r5 += "5";
  r5 += padRight("", 9);
  r5 += padLeft(detailCount + 2, 6);
  r5 += formatValueForCNAB(totalValue, 18);
  r5 += padLeft(0, 18);
  r5 += padRight("", 171);
  r5 += padRight("", 10);
  records.push(r5);

  // Registro 9 - Trailer de Arquivo
  let r9 = ITAU_BANK_CODE;
  r9 += "9999";
  r9 += "9";
  r9 += padRight("", 9);
  r9 += "000001";
  r9 += padLeft(records.length + 1, 6);
  r9 += padRight("", 211);
  records.push(r9);

  return records.join('\r\n');
}
