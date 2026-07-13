import React, { useState } from 'react';
import { Copy, CheckCircle2, Download } from 'lucide-react';

interface JsonPreviewProps {
  data: any;
}

export const JsonPreview: React.FC<JsonPreviewProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-${data.id || 'config'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={handleCopy}
          className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center justify-center"
          title="Copy JSON"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
        <button 
          onClick={handleDownload}
          className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center justify-center"
          title="Download JSON"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
      <pre className="p-6 bg-slate-900 text-slate-300 rounded-xl overflow-x-auto text-sm font-mono border border-slate-800 h-[600px]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
