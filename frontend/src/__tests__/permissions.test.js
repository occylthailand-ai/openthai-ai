import { describe, it, expect } from 'vitest';
import permissions from '../../../security/permissions.json';

describe('RBAC Permissions', () => {
  const roles = ['free', 'pro', 'business', 'admin'];

  it('should have all 4 roles defined', () => {
    roles.forEach((role) => {
      expect(permissions.roles).toHaveProperty(role);
    });
  });

  it('free plan should have limited daily generates', () => {
    expect(permissions.roles.free.limits.ai_generate_per_day).toBe(3);
  });

  it('pro and business should have unlimited generates', () => {
    expect(permissions.roles.pro.limits.ai_generate_per_day).toBe(-1);
    expect(permissions.roles.business.limits.ai_generate_per_day).toBe(-1);
  });

  it('only business and admin should have API access', () => {
    expect(permissions.roles.free.features.api_access).toBe(false);
    expect(permissions.roles.pro.features.api_access).toBe(false);
    expect(permissions.roles.business.features.api_access).toBe(true);
  });

  it('admin endpoint should only be accessible by admin', () => {
    const adminEndpoints = Object.entries(permissions.api_endpoints)
      .filter(([endpoint]) => endpoint.includes('/api/admin'));
    adminEndpoints.forEach(([, allowedRoles]) => {
      expect(allowedRoles).toContain('admin');
      expect(allowedRoles).not.toContain('free');
    });
  });

  it('pro plan price should be 149 THB', () => {
    expect(permissions.roles.pro.price_thb).toBe(149);
  });

  it('business plan price should be 299 THB', () => {
    expect(permissions.roles.business.price_thb).toBe(299);
  });
});
