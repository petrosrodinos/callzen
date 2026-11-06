import { Prisma } from 'generated/prisma';
import { StripeWebhooksService } from './stripe-webhooks.service';

const duplicate = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('StripeWebhooksService.receive', () => {
  const build = () => {
    const prisma = {
      stripeEvent: { create: jest.fn().mockResolvedValue({}), delete: jest.fn().mockResolvedValue({}) },
    };
    const stripe = {
      constructWebhookEvent: jest.fn().mockReturnValue({
        id: 'evt_1',
        type: 'customer.subscription.updated',
        created: 1_700_000_000,
        data: { object: { id: 'sub_1' } },
      }),
    };
    const sync = { applySubscription: jest.fn().mockResolvedValue({}) };
    const service = new StripeWebhooksService(
      prisma as never,
      stripe as never,
      sync as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, prisma, sync };
  };

  it('handles a new event once', async () => {
    const { service, sync } = build();
    await expect(service.receive(Buffer.from('{}'), 'sig')).resolves.toEqual({ received: true });
    expect(sync.applySubscription).toHaveBeenCalledTimes(1);
    expect(sync.applySubscription.mock.calls[0][1].eventAt).toEqual(new Date(1_700_000_000_000));
  });

  it('ignores a replayed event', async () => {
    const { service, prisma, sync } = build();
    prisma.stripeEvent.create.mockRejectedValueOnce(duplicate());
    await expect(service.receive(Buffer.from('{}'), 'sig')).resolves.toEqual({
      received: true,
      duplicate: true,
    });
    expect(sync.applySubscription).not.toHaveBeenCalled();
  });

  it('releases the claim when handling fails so Stripe can retry', async () => {
    const { service, prisma, sync } = build();
    sync.applySubscription.mockRejectedValueOnce(new Error('boom'));
    await expect(service.receive(Buffer.from('{}'), 'sig')).rejects.toThrow('boom');
    expect(prisma.stripeEvent.delete).toHaveBeenCalledWith({ where: { id: 'evt_1' } });
  });

  it('rejects requests without a signature', async () => {
    const { service } = build();
    await expect(service.receive(undefined, undefined)).rejects.toBeDefined();
  });
});
