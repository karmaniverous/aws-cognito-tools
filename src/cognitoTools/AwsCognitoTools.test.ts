import {
  AdminDeleteUserCommand,
  DescribeUserPoolCommand,
  ListUserPoolsCommand,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AwsCognitoTools } from './AwsCognitoTools';

const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

// Mock aws-xray-tools
vi.mock('@karmaniverous/aws-xray-tools', () => ({
  captureAwsSdkV3Client: vi.fn((client: unknown) => client),
  shouldEnableXray: vi.fn(() => false),
}));

describe('AwsCognitoTools', () => {
  describe('constructor', () => {
    it('creates instance with default options', () => {
      const tools = new AwsCognitoTools({
        clientConfig: { logger: noopLogger },
      });
      expect(tools.client).toBeDefined();
      expect(tools.clientConfig).toBeDefined();
      expect(tools.logger).toBeDefined();
      expect(tools.xray).toBeDefined();
      expect(tools.xray.mode).toBe('auto');
      expect(tools.xray.enabled).toBe(false);
    });

    it('creates instance with explicit xray off', () => {
      const tools = new AwsCognitoTools({
        clientConfig: { logger: noopLogger },
        xray: 'off',
      });
      expect(tools.xray.mode).toBe('off');
      expect(tools.xray.enabled).toBe(false);
    });

    it('exposes client as CognitoIdentityProviderClient', () => {
      const tools = new AwsCognitoTools({
        clientConfig: { logger: noopLogger },
      });
      expect(tools.client).toBeDefined();
      expect(typeof tools.client.send).toBe('function');
    });

    it('merges logger into effectiveClientConfig', () => {
      const tools = new AwsCognitoTools({
        clientConfig: { logger: noopLogger },
      });
      expect(tools.clientConfig.logger).toBe(tools.logger);
    });
  });

  describe('resolveUserPool', () => {
    let tools: AwsCognitoTools;
    let mockSend: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      tools = new AwsCognitoTools({ clientConfig: { logger: noopLogger } });
      mockSend = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (tools.client as any).send = mockSend;
    });

    it('describes pool directly when poolId is provided', async () => {
      mockSend.mockResolvedValueOnce({
        UserPool: { Id: 'pool-123', Name: 'test-pool' },
      });

      const pool = await tools.resolveUserPool({ poolId: 'pool-123' });
      expect(pool.Id).toBe('pool-123');
      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend.mock.calls[0]?.[0]).toBeInstanceOf(
        DescribeUserPoolCommand,
      );
    });

    it('describes pool when COGNITO_USER_POOL_ID env var is set', async () => {
      process.env.COGNITO_USER_POOL_ID = 'pool-env';
      mockSend.mockResolvedValueOnce({
        UserPool: { Id: 'pool-env', Name: 'env-pool' },
      });

      const pool = await tools.resolveUserPool();
      expect(pool.Id).toBe('pool-env');
      expect(mockSend).toHaveBeenCalledOnce();
      expect(mockSend.mock.calls[0]?.[0]).toBeInstanceOf(
        DescribeUserPoolCommand,
      );

      delete process.env.COGNITO_USER_POOL_ID;
    });

    it('discovers pool by env convention', async () => {
      mockSend
        .mockResolvedValueOnce({
          UserPools: [
            { Id: 'pool-111', Name: 'myapp-staging' },
            { Id: 'pool-222', Name: 'myapp-dev' },
          ],
        })
        .mockResolvedValueOnce({
          UserPool: { Id: 'pool-222', Name: 'myapp-dev' },
        });

      const pool = await tools.resolveUserPool({ env: 'dev' });
      expect(pool.Id).toBe('pool-222');
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(mockSend.mock.calls[0]?.[0]).toBeInstanceOf(ListUserPoolsCommand);
      expect(mockSend.mock.calls[1]?.[0]).toBeInstanceOf(
        DescribeUserPoolCommand,
      );
    });

    it('throws when no pool matches env convention', async () => {
      mockSend.mockResolvedValueOnce({
        UserPools: [{ Id: 'pool-111', Name: 'myapp-staging' }],
      });

      await expect(tools.resolveUserPool({ env: 'prod' })).rejects.toThrow(
        "No User Pool found matching convention '*-prod'",
      );
    });

    it('throws when neither poolId nor env is provided', async () => {
      await expect(tools.resolveUserPool()).rejects.toThrow(
        'Either poolId/env var or env is required',
      );
    });
  });

  describe('listAllUsers', () => {
    let tools: AwsCognitoTools;
    let mockSend: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      tools = new AwsCognitoTools({ clientConfig: { logger: noopLogger } });
      mockSend = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (tools.client as any).send = mockSend;
    });

    it('returns all users from a single page', async () => {
      mockSend.mockResolvedValueOnce({
        Users: [{ Username: 'user1' }, { Username: 'user2' }] as UserType[],
      });

      const users = await tools.listAllUsers({ userPoolId: 'pool-1' });
      expect(users).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it('paginates across multiple pages', async () => {
      mockSend
        .mockResolvedValueOnce({
          Users: [{ Username: 'user1' }] as UserType[],
          PaginationToken: 'token-1',
        })
        .mockResolvedValueOnce({
          Users: [{ Username: 'user2' }] as UserType[],
          PaginationToken: 'token-2',
        })
        .mockResolvedValueOnce({
          Users: [{ Username: 'user3' }] as UserType[],
        });

      const users = await tools.listAllUsers({ userPoolId: 'pool-1' });
      expect(users).toHaveLength(3);
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('respects maxResults guardrail', async () => {
      mockSend.mockResolvedValueOnce({
        Users: [
          { Username: 'user1' },
          { Username: 'user2' },
          { Username: 'user3' },
        ] as UserType[],
        PaginationToken: 'token-1',
      });

      const users = await tools.listAllUsers({
        userPoolId: 'pool-1',
        maxResults: 2,
      });
      expect(users).toHaveLength(2);
      // Should not fetch the next page
      expect(mockSend).toHaveBeenCalledOnce();
    });

    it('respects maxPages guardrail', async () => {
      mockSend
        .mockResolvedValueOnce({
          Users: [{ Username: 'user1' }] as UserType[],
          PaginationToken: 'token-1',
        })
        .mockResolvedValueOnce({
          Users: [{ Username: 'user2' }] as UserType[],
          PaginationToken: 'token-2',
        });

      const users = await tools.listAllUsers({
        userPoolId: 'pool-1',
        maxPages: 2,
      });
      expect(users).toHaveLength(2);
      // Should stop after 2 pages even though there's more
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('calls onPage callback for each page', async () => {
      const onPage = vi.fn();
      mockSend
        .mockResolvedValueOnce({
          Users: [{ Username: 'user1' }] as UserType[],
          PaginationToken: 'token-1',
        })
        .mockResolvedValueOnce({
          Users: [{ Username: 'user2' }] as UserType[],
        });

      await tools.listAllUsers({ userPoolId: 'pool-1', onPage });
      expect(onPage).toHaveBeenCalledTimes(2);
      expect(onPage).toHaveBeenCalledWith([{ Username: 'user1' }], 1);
      expect(onPage).toHaveBeenCalledWith([{ Username: 'user2' }], 2);
    });

    it('throws when userPoolId is missing', async () => {
      await expect(tools.listAllUsers({ userPoolId: '' })).rejects.toThrow(
        'userPoolId is required',
      );
    });
  });

  describe('purgeAllUsers', () => {
    let tools: AwsCognitoTools;
    let mockSend: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      tools = new AwsCognitoTools({ clientConfig: { logger: noopLogger } });
      mockSend = vi.fn();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (tools.client as any).send = mockSend;
    });

    it('purges all users from a pool', async () => {
      // resolveUserPool → DescribeUserPool
      mockSend.mockResolvedValueOnce({
        UserPool: {
          Id: 'pool-1',
          Name: 'test-dev',
          EstimatedNumberOfUsers: 2,
        },
      });
      // ListUsers → page 1
      mockSend.mockResolvedValueOnce({
        Users: [{ Username: 'user1' }] as UserType[],
        PaginationToken: 'token-1',
      });
      // AdminDeleteUser → user1
      mockSend.mockResolvedValueOnce({});
      // ListUsers → page 2
      mockSend.mockResolvedValueOnce({
        Users: [{ Username: 'user2' }] as UserType[],
      });
      // AdminDeleteUser → user2
      mockSend.mockResolvedValueOnce({});

      const count = await tools.purgeAllUsers({ userPoolId: 'pool-1' });
      expect(count).toBe(2);

      // Verify delete commands were sent
      const deleteCalls = mockSend.mock.calls.filter(
        (call: unknown[]) => call[0] instanceof AdminDeleteUserCommand,
      );
      expect(deleteCalls).toHaveLength(2);
    });

    it('returns 0 for an empty pool', async () => {
      mockSend.mockResolvedValueOnce({
        UserPool: {
          Id: 'pool-1',
          Name: 'test-dev',
          EstimatedNumberOfUsers: 0,
        },
      });
      mockSend.mockResolvedValueOnce({ Users: [] });

      const count = await tools.purgeAllUsers({ userPoolId: 'pool-1' });
      expect(count).toBe(0);
    });

    it('resolves pool by env when userPoolId not provided', async () => {
      // ListUserPools
      mockSend.mockResolvedValueOnce({
        UserPools: [{ Id: 'pool-1', Name: 'app-dev' }],
      });
      // DescribeUserPool
      mockSend.mockResolvedValueOnce({
        UserPool: {
          Id: 'pool-1',
          Name: 'app-dev',
          EstimatedNumberOfUsers: 0,
        },
      });
      // ListUsers → empty
      mockSend.mockResolvedValueOnce({ Users: [] });

      const count = await tools.purgeAllUsers({ env: 'dev' });
      expect(count).toBe(0);
      expect(mockSend.mock.calls[0]?.[0]).toBeInstanceOf(ListUserPoolsCommand);
    });
  });
});
