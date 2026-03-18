import { Activity, Database, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSystemStatus } from '@/hooks/queries/use-system';

export function ConnectionTester() {
  const { data, isLoading, isError } = useSystemStatus();

  if (isLoading) {
    return <div className="p-4 text-center text-slate-700">Conectando con motor local...</div>;
  }

  if (isError || !data) {
    return (
      <div className="p-4 text-center rounded-md bg-red-50 border border-red-200 text-red-700">
        Error Crítico: Motor Offline-First inaccesible. Revisa si Python y FastAPI están activos.
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Activity className="h-4 w-4 text-blue-600" /> Estado del Motor Local
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-slate-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Database className="h-4 w-4 text-slate-500" /> SQLite
          </div>
          <Badge variant={data.database === 'connected' ? 'default' : 'destructive'}>
            {data.database?.toUpperCase()}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <DollarSign className="h-4 w-4 text-slate-500" /> Tasa Ancla
          </div>
          <div className="font-mono font-semibold text-slate-800">
            {data.current_exchange_rate_bs.toFixed(2)} Bs / {data.anchor_currency}
          </div>
        </div>

        <div className="text-xs text-slate-500">Estado API: {data.status}</div>

        {data.lockdown_mode && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            ⚠️ LOCKDOWN MODE ACTIVO. Sincroniza con Internet para renovar credenciales.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
