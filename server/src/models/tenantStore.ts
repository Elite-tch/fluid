import { ApiKeyConfig } from "../middleware/apiKeys";

export interface Tenant {
  id: string;
  apiKey: string;
  name: string;
  tier: ApiKeyConfig["tier"];
  dailyQuotaStroops: number;
}

const tenantsByApiKey = new Map<string, Tenant>();

export function syncTenantFromApiKey(apiKeyConfig: ApiKeyConfig): Tenant {
  const existingTenant = tenantsByApiKey.get(apiKeyConfig.key);

  if (existingTenant) {
    const updatedTenant: Tenant = {
      ...existingTenant,
      name: apiKeyConfig.name,
      tier: apiKeyConfig.tier,
      dailyQuotaStroops: apiKeyConfig.dailyQuotaStroops,
    };

    tenantsByApiKey.set(apiKeyConfig.key, updatedTenant);
    return updatedTenant;
  }

  const tenant: Tenant = {
    id: apiKeyConfig.tenantId,
    apiKey: apiKeyConfig.key,
    name: apiKeyConfig.name,
    tier: apiKeyConfig.tier,
    dailyQuotaStroops: apiKeyConfig.dailyQuotaStroops,
  };

  tenantsByApiKey.set(apiKeyConfig.key, tenant);
  return tenant;
}

export function getTenantByApiKey(apiKey: string): Tenant | undefined {
  return tenantsByApiKey.get(apiKey);
}
