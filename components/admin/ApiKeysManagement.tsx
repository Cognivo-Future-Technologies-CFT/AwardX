import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Key, Save, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { adminService, ApiKey } from '../../services/adminService';
import { toast } from 'sonner';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', description: 'Used for AI grading and text generation.' },
  { id: 'groq', name: 'Groq', description: 'Used for fast LLM inference tasks.' },
  { id: 'razorpay', name: 'Razorpay', description: 'Payment gateway for platform transactions.' },
  { id: 'twilio', name: 'Twilio', description: 'SMS integration and notifications.' },
  { id: 'google_maps', name: 'Google Maps', description: 'Location and address autocomplete services.' },
  { id: 'smtp', name: 'SMTP Provider', description: 'Custom email delivery service.' }
];

export const ApiKeysManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: adminService.getApiKeys,
  });

  const saveMutation = useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) => 
      adminService.updateApiKey(provider, key, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
      toast.success('API Key updated successfully');
      setEditingProvider(null);
      setInputValue('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update API Key');
    }
  });

  const handleSave = (providerId: string) => {
    if (!inputValue.trim()) {
      toast.error('API Key cannot be empty');
      return;
    }
    saveMutation.mutate({ provider: providerId, key: inputValue.trim() });
  };

  const toggleVisibility = (providerId: string) => {
    setShowValues(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">External Integrations</h2>
            <p className="text-sm text-slate-500 mt-1">Manage API keys securely. Values are encrypted at rest.</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {PROVIDERS.map((provider) => {
            const existingKey = apiKeys.find(k => k.provider === provider.id);
            const isEditing = editingProvider === provider.id;
            const isSaving = saveMutation.isPending && saveMutation.variables?.provider === provider.id;
            const isVisible = showValues[provider.id];

            return (
              <div key={provider.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  
                  {/* Provider Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Key className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        {provider.name}
                        {existingKey?.is_active && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3" /> Configured
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{provider.description}</p>
                      {existingKey?.updated_at && (
                        <p className="text-xs text-slate-400 mt-2">
                          Last updated {new Date(existingKey.updated_at).toLocaleDateString()} 
                          {existingKey.updated_by?.full_name ? ` by ${existingKey.updated_by.full_name}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Area */}
                  <div className="flex-1 w-full max-w-md">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={`Enter ${provider.name} API Key`}
                            className="w-full pl-4 pr-10 py-2 bg-white border border-indigo-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all text-sm font-mono text-slate-700"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={() => handleSave(provider.id)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save
                        </button>
                        <button
                          onClick={() => setEditingProvider(null)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input
                            type={isVisible ? 'text' : 'password'}
                            value={existingKey ? '••••••••••••••••••••••••••••••••' : ''}
                            readOnly
                            placeholder="Not configured"
                            className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-500 cursor-not-allowed"
                          />
                          {existingKey && (
                            <button
                              onClick={() => toggleVisibility(provider.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                              title={isVisible ? "Hide secret" : "This secret is securely encrypted and cannot be viewed. You can only overwrite it."}
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setEditingProvider(provider.id);
                            setInputValue('');
                          }}
                          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
                        >
                          {existingKey ? 'Update Key' : 'Configure'}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200/60">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-amber-800">Security Notice</h4>
          <p className="text-sm text-amber-700 mt-1 leading-relaxed">
            API Keys are encrypted using AES-256-GCM before being stored in the database. For security reasons, existing keys cannot be viewed—only overwritten. All updates are recorded in the Audit Logs.
          </p>
        </div>
      </div>
    </div>
  );
};
