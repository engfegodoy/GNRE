
export interface GnreGuia {
  id: string;
  fileName: string;
  linhaDigitavel: string;
  valor: number;
  vencimento: string; // Format: DD/MM/YYYY
  uf: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface CompanyInfo {
  name: string;
  cnpj: string;
  agency: string;
  account: string;
  dac: string;
}

export interface ExtractionResult {
  linhaDigitavel: string;
  valor: number;
  vencimento: string;
  uf: string;
}
