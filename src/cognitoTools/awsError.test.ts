import { describe, expect, it } from 'vitest';

import {
  isResourceNotFoundException,
  isUserNotFoundException,
} from './awsError';

describe('awsError', () => {
  describe('isUserNotFoundException', () => {
    it('returns true for name match', () => {
      expect(isUserNotFoundException({ name: 'UserNotFoundException' })).toBe(
        true,
      );
    });

    it('returns true for __type match', () => {
      expect(isUserNotFoundException({ __type: 'UserNotFoundException' })).toBe(
        true,
      );
    });

    it('returns false for other errors', () => {
      expect(isUserNotFoundException({ name: 'SomethingElse' })).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isUserNotFoundException('string')).toBe(false);
      expect(isUserNotFoundException(null)).toBe(false);
      expect(isUserNotFoundException(undefined)).toBe(false);
    });
  });

  describe('isResourceNotFoundException', () => {
    it('returns true for name match', () => {
      expect(
        isResourceNotFoundException({ name: 'ResourceNotFoundException' }),
      ).toBe(true);
    });

    it('returns true for __type match', () => {
      expect(
        isResourceNotFoundException({
          __type: 'ResourceNotFoundException',
        }),
      ).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(
        isResourceNotFoundException({ name: 'UserNotFoundException' }),
      ).toBe(false);
    });
  });
});
