export interface SponsoredTransactionRecord {
  id: string;
  tenantId: string;
  feeStroops: number;
  createdAt: Date;
}

const sponsoredTransactions: SponsoredTransactionRecord[] = [];

function getUtcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export function recordSponsoredTransaction(
  tenantId: string,
  feeStroops: number,
  createdAt: Date = new Date()
): SponsoredTransactionRecord {
  const record: SponsoredTransactionRecord = {
    id: `${tenantId}-${createdAt.getTime()}-${sponsoredTransactions.length + 1}`,
    tenantId,
    feeStroops,
    createdAt,
  };

  sponsoredTransactions.push(record);
  return record;
}

export function getTenantDailySpendStroops(
  tenantId: string,
  now: Date = new Date()
): number {
  const { start, end } = getUtcDayRange(now);

  return sponsoredTransactions
    .filter(
      (record) =>
        record.tenantId === tenantId &&
        record.createdAt >= start &&
        record.createdAt < end
    )
    .reduce((sum, record) => sum + record.feeStroops, 0);
}
