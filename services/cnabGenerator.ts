
import { GnreGuia, CompanyInfo } from '../types';
import { ITAU_BANK_CODE } from '../constants';

/**
 * Auxiliar para preencher com zeros à esquerda (campos numéricos)
 */
const padLeft = (val: string | number, len: number): string => {
  return String(val).padStart(len, '0').substring(0, len);
};

/**
 * Auxiliar para preencher com espaços à direita (campos alfanuméricos)
 */
const padRight = (val: string | number, len: number): string => {
  return String(val).padEnd(len, ' ').substring(0, len);
};

/**
 * Remove formatação da data (DD/MM/YYYY -> DDMMYYYY)
 */
const formatDate = (dateStr: string): string => {
  return dateStr.replace(/\D/g, '');
};

/**
 * Formata valor monetário para o padrão CNAB (sem vírgula, centavos inclusos)
 */
const formatValue = (val: number, len: number): string => {
  const cents = Math.round(val * 100);
  return padLeft(cents, len);
};

/**
 * Garante que a linha tenha exatamente 240 caracteres
 */
const buildLine = (content: string): string => {
  return content.padEnd(240, ' ').substring(0, 240);
};

export function generateCNAB240(guias: GnreGuia[], company: CompanyInfo): string {
  const now = new Date();
  const dateStr = padLeft(now.getDate(), 2) + padLeft(now.getMonth() + 1, 2) + now.getFullYear();
  const timeStr = padLeft(now.getHours(), 2) + padLeft(now.getMinutes(), 2) + padLeft(now.getSeconds(), 2);
  const cnpjClean = company.cnpj.replace(/\D/g, "");

  const records: string[] = [];

  // 1. REGISTRO 0 - HEADER DE ARQUIVO
  let r0 = ITAU_BANK_CODE;                     // 001-003: Banco
  r0 += "0000";                                // 004-007: Lote
  r0 += "0";                                   // 008-008: Tipo Registro
  r0 += padRight("", 6);                       // 009-014: Brancos
  r0 += "080";                                 // 015-017: Versão Layout
  r0 += "2";                                   // 018-018: Tipo Inscrição (2=CNPJ)
  r0 += padLeft(cnpjClean, 14);                // 019-032: CNPJ
  r0 += padRight("", 20);                      // 033-052: Convênio (Branco para Sispag)
  r0 += padLeft(company.agency, 5);            // 053-057: Agência
  r0 += " ";                                   // 058-058: Branco
  r0 += padLeft(company.account, 12);          // 059-070: Conta
  r0 += " ";                                   // 071-071: Branco
  r0 += company.dac;                           // 072-072: DAC
  r0 += padRight(company.name, 30);            // 073-102: Nome Empresa
  r0 += padRight("BANCO ITAU S.A.", 30);       // 103-132: Nome Banco
  r0 += padRight("", 10);                      // 133-142: Brancos
  r0 += "1";                                   // 143-143: Código Remessa
  r0 += dateStr;                               // 144-151: Data Geração
  r0 += timeStr;                               // 152-157: Hora Geração
  r0 += padLeft(1, 9);                         // 158-166: Seqüencial
  r0 += "08000";                               // 167-171: Versão Layout (ou 00000)
  r0 += padRight("", 69);                      // 172-240: Reservado
  records.push(buildLine(r0));

  // 2. REGISTRO 1 - HEADER DE LOTE
  let r1 = ITAU_BANK_CODE;                     // 001-003: Banco
  r1 += "0001";                                // 004-007: Lote
  r1 += "1";                                   // 008-008: Registro
  r1 += "C";                                   // 009-009: Operação (C=Débito)
  r1 += "22";                                  // 010-011: Serviço (22=Pagamento Tributos)
  r1 += "91";                                  // 012-013: Forma Lançamento (91=GNRE)
  r1 += "030";                                 // 014-016: Layout Lote (030 Sispag)
  r1 += " ";                                   // 017-017: Branco
  r1 += "2";                                   // 018-018: Tipo Inscrição
  r1 += padLeft(cnpjClean, 14);                // 019-032: CNPJ
  r1 += padRight("", 20);                      // 033-052: Convênio (Branco Sispag)
  r1 += padLeft(company.agency, 5);            // 053-057: Agência
  r1 += " ";                                   // 058-058: Branco
  r1 += padLeft(company.account, 12);          // 059-070: Conta
  r1 += " ";                                   // 071-071: Branco
  r1 += company.dac;                           // 072-072: DAC
  r1 += padRight(company.name, 30);            // 073-102: Nome Empresa
  r1 += padRight("", 30);                      // 103-132: Mensagem
  r1 += padRight("", 10);                      // 133-142: Logradouro/Cidade/UF... (Brancos para Tributos)
  r1 += padRight("", 30);                      // 143-172: Brancos
  r1 += padRight("", 30);                      // 173-202: Brancos
  r1 += padRight("", 10);                      // 203-212: Brancos
  r1 += padLeft(0, 8);                         // 213-220: Data Crédito (Zeros)
  r1 += padRight("", 20);                      // 221-240: Brancos
  records.push(buildLine(r1));

  let totalValue = 0;
  let detailCount = 0;

  guias.filter(g => g.status === 'completed').forEach((guia, idx) => {
    totalValue += guia.valor;
    detailCount++;

    const seqInLote = padLeft(idx + 1, 5);
    const vencFormat = formatDate(guia.vencimento);
    const seuNumero = padRight(`GNRE-${guia.uf}-${vencFormat}-${padLeft(idx+1, 2)}`, 20);

    // 3. REGISTRO 3 - SEGMENTO O (DETALHE)
    let r3 = ITAU_BANK_CODE;                   // 001-003: Banco
    r3 += "0001";                              // 004-007: Lote
    r3 += "3";                                 // 008-008: Registro
    r3 += seqInLote;                           // 009-013: Seq Lote
    r3 += "O";                                 // 014-014: Segmento
    r3 += "000";                               // 015-017: Movimento (000=Inclusão)
    r3 += padRight(guia.linhaDigitavel, 48);    // 018-065: Linha Digitável
    r3 += padRight(`GNRE ${guia.uf}`, 30);     // 066-095: Nome Contribuinte/Estado
    r3 += vencFormat;                          // 096-103: Data Vencimento
    r3 += "REA";                               // 104-106: Sigla REA (Real)
    r3 += padLeft(0, 15);                      // 107-121: Outras Entidades (Zeros)
    r3 += formatValue(guia.valor, 15);         // 122-136: Valor a Pagar
    r3 += vencFormat;                          // 137-144: Data Pagamento (Usa data venc)
    r3 += padLeft(0, 15);                      // 145-159: Valor Pago (Forçado Zero conforme regra 8)
    r3 += padRight("", 3);                     // 160-162: Brancos
    r3 += padLeft(0, 9);                       // 163-171: Zeros
    r3 += padRight("", 3);                     // 172-174: Brancos
    r3 += seuNumero;                           // 175-194: Seu Número
    r3 += padRight("", 21);                    // 195-215: Brancos
    r3 += padRight("", 15);                    // 216-230: Brancos
    r3 += padRight("", 10);                    // 231-240: Brancos
    records.push(buildLine(r3));
  });

  // 4. REGISTRO 5 - TRAILER DE LOTE
  let r5 = ITAU_BANK_CODE;                     // 001-003: Banco
  r5 += "0001";                                // 004-007: Lote
  r5 += "5";                                   // 008-008: Registro
  r5 += padRight("", 9);                       // 009-017: Brancos
  r5 += padLeft(detailCount + 2, 6);           // 018-023: Qtde Registros Lote
  r5 += formatValue(totalValue, 18);           // 024-041: Somatória Valores (18 posições)
  r5 += padLeft(0, 18);                        // 042-059: Qtde Moedas (Zeros)
  r5 += padLeft(0, 6);                         // 060-065: Núm. Aviso Débito (Zeros)
  r5 += padRight("", 165);                     // 066-230: Brancos
  r5 += padRight("", 10);                      // 231-240: Brancos
  records.push(buildLine(r5));

  // 5. REGISTRO 9 - TRAILER DE ARQUIVO
  let r9 = ITAU_BANK_CODE;                     // 001-003: Banco
  r9 += "9999";                                // 004-007: Lote
  r9 += "9";                                   // 008-008: Registro
  r9 += padRight("", 9);                       // 009-017: Brancos
  r9 += "000001";                              // 018-023: Qtde Lotes
  r9 += padLeft(records.length + 1, 6);        // 024-029: Qtde Registros Arquivo
  r9 += padLeft(0, 6);                         // 030-035: Qtde Contas Conciliação (Zeros)
  r9 += padRight("", 205);                     // 036-240: Brancos
  records.push(buildLine(r9));

  return records.join('\r\n');
}
