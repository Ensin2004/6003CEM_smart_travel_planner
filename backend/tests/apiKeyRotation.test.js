const { getKeyRotationStatus, resolveRotatedApiKey } = require('../src/utils/apiKeyRotation');

describe('api key rotation policy', () => {
  const now = new Date('2026-06-21T00:00:00.000Z');

  test('keeps a key active when it was rotated within the allowed window', () => {
    const status = getKeyRotationStatus({
      key: 'secret-value',
      keyName: 'SERPAPI_KEY',
      now,
      rotatedAt: '2026-01-01',
      rotationDays: 183,
    });

    expect(status.active).toBe(true);
    expect(status.ageDays).toBeLessThanOrEqual(183);
  });

  test('expires a key when it is older than the allowed window', () => {
    const warnings = [];
    const key = resolveRotatedApiKey({
      key: 'secret-value',
      keyName: 'SERPAPI_KEY',
      nodeEnv: 'production',
      now,
      rotatedAt: '2025-01-01',
      rotationDays: 183,
      warnings,
    });

    expect(key).toBe('');
    expect(warnings[0]).toContain('must be rotated every 183 days');
  });

  test('requires a valid rotation date when a key is configured', () => {
    const status = getKeyRotationStatus({
      key: 'secret-value',
      keyName: 'GROQ_API_KEY',
      now,
      rotatedAt: '',
      rotationDays: 183,
    });

    expect(status.active).toBe(false);
    expect(status.reason).toBe('missing-rotation-date');
  });

  test('skips enforcement in test mode', () => {
    const warnings = [];
    const key = resolveRotatedApiKey({
      key: 'secret-value',
      keyName: 'GEMINI_API_KEY',
      nodeEnv: 'test',
      now,
      rotatedAt: '',
      rotationDays: 183,
      warnings,
    });

    expect(key).toBe('secret-value');
    expect(warnings).toEqual([]);
  });
});
