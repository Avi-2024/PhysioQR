import type { ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, ExternalLink, Eye, FileSearch, QrCode, QrCodeIcon, Save, ShieldOff, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AdminResourceDrawerMode, AdminResourceKey, ApiRecord } from '@/features/admin/resources';
import { adminResourceModules, displayValue, getRecordId, getValue, recordObjectId } from '@/features/admin/resources';

function IconButton({ label, onClick, icon: Icon, danger = false }: { label: string; onClick: () => void; icon: ElementType; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      className={cn(
        'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold transition-colors',
        danger ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-neutral-200 bg-white text-neutral-700 hover:bg-primary-50 hover:text-primary-700',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{label}</span>
    </button>
  );
}

export function AdminResourceRowActions({
  moduleKey,
  row,
  onDetails,
  onAction,
}: {
  moduleKey: AdminResourceKey;
  row: ApiRecord;
  onDetails: () => void;
  onAction: (action: string, mode: AdminResourceDrawerMode) => void;
}) {
  const navigate = useNavigate();
  const rowId = getRecordId(row, adminResourceModules[moduleKey]);
  const objectId = recordObjectId(row);

  if (moduleKey === 'doctors') {
    const status = displayValue(getValue(row, 'status')).toLowerCase();
    const qrActive = getValue(row, 'qrCodeActive');
    const isPending = ['submitted', 'pending', 'under_review', 'documents_required'].includes(status);
    const isApproved = status === 'approved';
    const canRequestDocs = !isApproved && status !== 'suspended';
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Open workspace" onClick={() => navigate(`/admin/doctors/${objectId || rowId}`)} icon={ExternalLink} />
        {(isPending || isApproved) && <IconButton label="Approve" onClick={() => onAction('approve', 'doctor-action')} icon={CheckCircle2} />}
        {canRequestDocs && <IconButton label="Request docs" onClick={() => onAction('request-documents', 'doctor-action')} icon={FileSearch} />}
        {isPending && <IconButton label="Reject" onClick={() => onAction('reject', 'doctor-action')} icon={XCircle} danger />}
        {isApproved && <IconButton label="Suspend" onClick={() => onAction('suspend', 'doctor-action')} icon={ShieldOff} danger />}
        {isApproved && (qrActive
          ? <IconButton label="Disable QR" onClick={() => onAction('disable-qr', 'doctor-action')} icon={QrCodeIcon} danger />
          : <IconButton label="Reactivate QR" onClick={() => onAction('reactivate-qr', 'doctor-action')} icon={QrCode} />)}
      </div>
    );
  }

  if (moduleKey === 'clinicVisits') return <IconButton label="View detail" onClick={() => onAction('view', 'visit-detail')} icon={Eye} />;

  if (moduleKey === 'agents') {
    return (
      <div className="flex flex-wrap gap-2">
        <IconButton label="Open workspace" onClick={() => navigate(`/admin/agents/${objectId || rowId}`)} icon={ExternalLink} />
        <IconButton label="Edit" onClick={() => onAction('edit', 'record-form')} icon={Save} />
        <IconButton label="Terminate" onClick={() => onAction('delete', 'record-form')} icon={Trash2} danger />
      </div>
    );
  }

  if (moduleKey === 'riskReviews') {
    return <div className="flex flex-wrap gap-2"><IconButton label="Clear" onClick={() => onAction('cleared', 'risk-action')} icon={CheckCircle2} /><IconButton label="Block" onClick={() => onAction('blocked', 'risk-action')} icon={XCircle} danger /></div>;
  }

  if (moduleKey === 'fraudRisk') {
    return <div className="flex flex-wrap gap-2"><IconButton label="Review" onClick={() => onAction('reviewing', 'fraud-action')} icon={Eye} /><IconButton label="Resolve" onClick={() => onAction('resolved', 'fraud-action')} icon={CheckCircle2} /></div>;
  }

  if (moduleKey === 'programs') {
    return <div className="flex flex-wrap gap-2"><IconButton label="Manage days" onClick={() => onAction('days', 'program-day')} icon={ClipboardList} /><IconButton label="Edit" onClick={() => onAction('edit', 'record-form')} icon={Save} /></div>;
  }

  if (moduleKey === 'exercises' || moduleKey === 'videos') {
    return <div className="flex flex-wrap gap-2"><IconButton label="Edit" onClick={() => onAction('edit', 'record-form')} icon={Save} /><IconButton label="Deactivate" onClick={() => onAction('delete', 'record-form')} icon={Trash2} danger /></div>;
  }

  if (moduleKey === 'revenueModels') {
    return <div className="flex flex-wrap gap-2"><IconButton label="Edit model" onClick={() => onAction('edit', 'record-form')} icon={Save} /><IconButton label="Preview" onClick={onDetails} icon={Eye} /></div>;
  }

  if (['patients', 'payments', 'withdrawals', 'support'].includes(moduleKey)) {
    const base = moduleKey === 'patients' ? '/admin/patients' : moduleKey === 'payments' ? '/admin/payments' : moduleKey === 'withdrawals' ? '/admin/withdrawals' : '/admin/support';
    return <IconButton label="Open" onClick={() => navigate(`${base}/${objectId || rowId}`)} icon={ExternalLink} />;
  }

  return <IconButton label="Preview" onClick={onDetails} icon={Eye} />;
}
