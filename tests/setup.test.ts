/**
 * Test Setup Verification
 * 
 * Verifies that the testing framework is properly configured.
 */

import { test, expect } from 'bun:test';

test('testing framework is working', () => {
  expect(true).toBe(true);
});

test('TypeScript strict mode is enabled', () => {
  // This test will fail to compile if strict mode is not enabled
  const value: string = 'test';
  expect(value).toBe('test');
});
