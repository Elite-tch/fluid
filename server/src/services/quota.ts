import { Tenant } from "../models/tenantStore";
import { getTenantDailySpendStroops } from "../models/transactionLedger";

export interface QuotaCheckResult {
  allowed: boolean;
  currentSpendStroops: number;
  projectedSpendStroops: number;
  dailyQuotaStroops: number;
}

export function checkTenantDailyQuota(
  tenant: Tenant,
  feeStroops: number,
  now: Date = new Date()
): QuotaCheckResult {
  const currentSpendStroops = getTenantDailySpendStroops(tenant.id, now);
  const projectedSpendStroops = currentSpendStroops + feeStroops;

  return {
    allowed: projectedSpendStroops <= tenant.dailyQuotaStroops,
    currentSpendStroops,
    projectedSpendStroops,
    dailyQuotaStroops: tenant.dailyQuotaStroops,
  };
}
