import React, { useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, CheckCircle, XCircle } from 'lucide-react';
import { fetchBackendJson } from '../../services/backendApi';

interface VerificationData {
  valid: boolean;
  recipientName: string;
  certificateType: string;
  roundsCleared: number;
  totalRounds: number;
  programTitle: string;
  issuedAt: string;
}

export const CertificateVerifyPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['certificate-verify', code],
    queryFn: () => fetchBackendJson<VerificationData>(`/api/certificates/verify/${code}`),
    enabled: !!code,
  });

  useEffect(() => {
    if (!data?.valid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1120;
    canvas.height = 800;
    const { recipientName, certificateType, roundsCleared, totalRounds, programTitle, issuedAt } = data;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const accent = certificateType === 'winner' ? '#d97706' : '#6366f1';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 12;
    ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);
    ctx.strokeStyle = certificateType === 'winner' ? '#fbbf24' : '#a5b4fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    ctx.fillStyle = '#1e293b'; ctx.font = 'bold 42px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE', canvas.width / 2, 140);
    const subtitle = certificateType === 'winner' ? 'OF EXCELLENCE' : certificateType === 'round_advance' ? 'OF MERIT' : 'OF PARTICIPATION';
    ctx.font = '20px Georgia, serif'; ctx.fillStyle = '#64748b';
    ctx.fillText(subtitle, canvas.width / 2, 180);
    ctx.font = '18px Georgia, serif'; ctx.fillStyle = '#475569';
    ctx.fillText('This is to certify that', canvas.width / 2, 270);
    ctx.font = 'bold 36px Georgia, serif'; ctx.fillStyle = '#1e293b';
    ctx.fillText(recipientName, canvas.width / 2, 330);
    ctx.font = '18px Georgia, serif'; ctx.fillStyle = '#475569';
    const detail = certificateType === 'winner'
      ? `has completed all ${totalRounds} rounds and emerged as a winner in`
      : certificateType === 'round_advance'
        ? `has cleared ${roundsCleared} of ${totalRounds} rounds with outstanding merit in`
        : 'has participated in';
    ctx.fillText(detail, canvas.width / 2, 400);
    ctx.font = 'bold 24px Georgia, serif'; ctx.fillStyle = '#4f46e5';
    ctx.fillText(programTitle, canvas.width / 2, 460);
    ctx.font = '16px Georgia, serif'; ctx.fillStyle = '#64748b';
    ctx.fillText(`Issued: ${new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, canvas.width / 2, 650);
    ctx.font = '12px Georgia, serif'; ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Verification: ${window.location.href}`, canvas.width / 2, 740);
  }, [data]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-500 animate-pulse">Verifying certificate...</p>
    </div>
  );

  if (error || !data?.valid) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <XCircle className="w-16 h-16 text-red-400" />
      <h1 className="text-2xl font-bold text-slate-900">Invalid Certificate</h1>
      <p className="text-slate-500">This verification link is invalid or the certificate does not exist.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <span className="text-green-700 font-semibold text-lg">Verified Certificate</span>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center space-y-4">
          <Award className="w-10 h-10 text-indigo-600 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-900">{data.recipientName}</h1>
          <p className="text-slate-600">
            {data.certificateType === 'winner' ? 'Winner' : data.certificateType === 'round_advance' ? 'Certificate of Merit' : 'Certificate of Participation'}
            {' — '}<span className="font-medium">{data.programTitle}</span>
          </p>
          <p className="text-sm text-slate-500">
            Cleared {data.roundsCleared} of {data.totalRounds} rounds •
            Issued {new Date(data.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <canvas ref={canvasRef} className="w-full rounded-xl border border-slate-200 shadow-sm" />
      </div>
    </div>
  );
};
