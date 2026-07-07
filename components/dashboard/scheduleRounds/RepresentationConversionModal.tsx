import React from 'react';
import { Modal } from '../../Modal';
import { Button } from '../../Button';
import { ArrowRightLeft, AlertTriangle } from 'lucide-react';
import type { ConversionAnalysis } from '../../../lib/roundRepresentationConversion';

interface RepresentationConversionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  analysis: ConversionAnalysis | null;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const RepresentationConversionModal: React.FC<RepresentationConversionModalProps> = ({
  isOpen,
  title,
  description,
  analysis,
  isSubmitting = false,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="default">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{description}</p>

        {analysis && analysis.warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">Conversion rules</span>
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-amber-900">
              {analysis.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isSubmitting || !analysis?.canConvert}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Converting…' : 'Convert'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
