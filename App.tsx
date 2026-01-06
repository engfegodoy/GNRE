
import React, { useState } from 'react';
import { GnreGuia, ExtractionResult } from './types';
import { COMPANY_INFO } from './constants';
import { extractGnreData } from './services/geminiService';
import { generateCNAB240 } from './services/cnabGenerator';
import { Upload, FileText, Download, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';

declare const pdfjsLib: any;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const App: React.FC = () => {
  const [guiasList, setGuiasList] = useState<GnreGuia[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Cada página se refere a uma guia. Se são 5 páginas, são 5 guias.
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 3.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const base64Image = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

      try {
        const extractions: ExtractionResult[] = await extractGnreData(base64Image);
        
        // Garantimos que pegamos apenas a primeira guia extraída de cada página
        if (extractions && extractions.length > 0) {
          const data = extractions[0];
          const newItem: GnreGuia = {
            id: `${Date.now()}-${pageNum}-${Math.random()}`,
            fileName: pdf.numPages > 1 ? `${file.name} (Pág. ${pageNum})` : file.name,
            ...data,
            status: 'completed' as const,
          };
          setGuiasList(prev => [...prev, newItem]);
        }
      } catch (error) {
        console.error(`Erro na página ${pageNum}:`, error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    for (let i = 0; i < files.length; i++) {
      await processFile(files[i]);
    }
    setIsProcessing(false);
  };

  const downloadCNAB = () => {
    const completedGuias = guiasList.filter(g => g.status === 'completed');
    if (completedGuias.length === 0) {
      alert("Nenhuma guia válida para gerar o CNAB.");
      return;
    }

    const cnabContent = generateCNAB240(completedGuias, COMPANY_INFO);
    const blob = new Blob([cnabContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const filename = `SPG${mm}${dd}01`.substring(0, 8);
    
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const removeItem = (id: string) => {
    setGuiasList(prev => prev.filter(g => g.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GNRE Reader Pro</h1>
          <p className="text-slate-500 mt-1">Extração por página e geração de CNAB 240 corrigido.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
            <Info size={20} />
          </div>
          <div className="max-w-[320px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa Remetente</p>
            <p className="text-sm font-bold text-slate-800 truncate">{COMPANY_INFO.name}</p>
            <p className="text-xs text-slate-500 font-medium">Ag: {COMPANY_INFO.agency} CC: {COMPANY_INFO.account}-{COMPANY_INFO.dac}</p>
          </div>
        </div>
      </header>

      {/* Orientações - Conforme imagem fornecida */}
      <section className="mb-8 bg-[#F4F7FA] border border-[#E5EBF2] rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="text-slate-700">
            <Info size={18} strokeWidth={2.5} />
          </div>
          <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-wide">COMO FUNCIONA:</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 md:gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold">1</div>
            <p className="text-[13px] text-slate-600 leading-snug font-medium">
              Faça o upload de uma ou mais guias GNRE em formato PDF.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold">2</div>
            <p className="text-[13px] text-slate-600 leading-snug font-medium">
              O sistema utiliza IA para ler e validar os dados de pagamento automaticamente.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold">3</div>
            <p className="text-[13px] text-slate-600 leading-snug font-medium">
              Clique em "Gerar CNAB" para baixar o arquivo pronto para envio ao Banco Itaú (Sispag).
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <label className={`relative group cursor-pointer flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 hover:border-blue-400 transition-all shadow-sm ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isProcessing ? (
              <>
                <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
                <p className="text-base font-bold text-blue-600">Lendo guias...</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold text-center">Analizando cada página individualmente</p>
              </>
            ) : (
              <>
                <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform mb-4">
                  <Upload size={28} />
                </div>
                <p className="mb-2 text-base text-slate-700">
                  <span className="font-bold">Clique para enviar</span> ou arraste o PDF aqui
                </p>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Cada página será processada como uma guia</p>
              </>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf" 
            multiple 
            onChange={handleFileUpload} 
            disabled={isProcessing}
          />
        </label>
      </section>

      {guiasList.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden mb-12">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-white">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
              <FileText size={22} className="text-blue-600" />
              Guias Extraídas ({guiasList.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuiasList([])}
                className="text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest px-4 py-2"
              >
                Limpar
              </button>
              <button
                onClick={downloadCNAB}
                disabled={isProcessing || guiasList.filter(g => g.status === 'completed').length === 0}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:shadow-none uppercase text-sm tracking-widest"
              >
                <Download size={18} />
                Gerar CNAB
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-6 py-5 text-center w-16">Status</th>
                  <th className="px-6 py-5">Arquivo / Página</th>
                  <th className="px-6 py-5 text-center">UF</th>
                  <th className="px-6 py-5">Linha Digitável</th>
                  <th className="px-6 py-5 text-right">Vencimento</th>
                  <th className="px-6 py-5 text-right">Valor</th>
                  <th className="px-6 py-5 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guiasList.map((guia) => (
                  <tr key={guia.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                      <CheckCircle size={20} className="text-emerald-500 mx-auto" />
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 truncate max-w-[160px]">
                        {guia.fileName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded flex items-center justify-center w-10 mx-auto">
                        {guia.uf}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg select-all">
                        {guia.linhaDigitavel}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-700 font-bold">
                      {guia.vencimento}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-base font-black text-slate-900">
                        {guia.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => removeItem(guia.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                      >
                        <XCircle size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        GNRE Reader Pro &bull; Itaú CNAB 240 (Sispag Corrigido) &bull; Layout 080
      </footer>
    </div>
  );
};

export default App;
