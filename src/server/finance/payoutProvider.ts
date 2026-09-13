import { logger } from '../logger.js';

export interface PayoutRequest {
  withdrawalId: number;
  publicReference: string;
  amount: string;
  currency: string;
  destinationDetails: {
    type: string;
    maskedIdentifier: string;
    provider: string;
  };
}

export interface PayoutResult {
  success: boolean;
  providerReference: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  rawResponse: Record<string, unknown>;
  errorMessage?: string;
}

export interface PayoutProviderInterface {
  name: string;
  createPayout(req: PayoutRequest): Promise<PayoutResult>;
  getPayoutStatus(providerReference: string): Promise<PayoutResult>;
  cancelPayout(providerReference: string): Promise<boolean>;
}

export class SandboxPayoutAdapter implements PayoutProviderInterface {
  public name = 'SANDBOX_PAYOUT_GATEWAY';

  public async createPayout(req: PayoutRequest): Promise<PayoutResult> {
    logger.info('FINANCE', `[${this.name}] Submitting payout ${req.publicReference} for ${req.currency} ${req.amount}`);
    
    // Simulate API latency & processing
    const providerRef = `SANDBOX_PO_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

    // In sandbox mode, payouts automatically succeed unless amount ends in .99 (simulated failure test)
    const isSimulatedFailure = req.amount.endsWith('.99');

    if (isSimulatedFailure) {
      return {
        success: false,
        providerReference: providerRef,
        status: 'FAILED',
        rawResponse: { gateway: this.name, code: 'SIMULATED_REJECTION', timestamp: new Date().toISOString() },
        errorMessage: 'Simulated payment gateway payout failure'
      };
    }

    return {
      success: true,
      providerReference: providerRef,
      status: 'PROCESSING',
      rawResponse: { gateway: this.name, code: 'SUCCESS', timestamp: new Date().toISOString() }
    };
  }

  public async getPayoutStatus(providerReference: string): Promise<PayoutResult> {
    return {
      success: true,
      providerReference,
      status: 'COMPLETED',
      rawResponse: { gateway: this.name, checked_at: new Date().toISOString() }
    };
  }

  public async cancelPayout(providerReference: string): Promise<boolean> {
    logger.info('FINANCE', `[${this.name}] Cancelled payout ref: ${providerReference}`);
    return true;
  }
}

export class ManualPayoutProvider implements PayoutProviderInterface {
  public name = 'MANUAL_FINANCE_DISBURSEMENT';

  public async createPayout(req: PayoutRequest): Promise<PayoutResult> {
    const providerRef = `MANUAL_REF_${req.publicReference}`;
    return {
      success: true,
      providerReference: providerRef,
      status: 'PROCESSING',
      rawResponse: { mode: 'manual_processing_required', timestamp: new Date().toISOString() }
    };
  }

  public async getPayoutStatus(providerReference: string): Promise<PayoutResult> {
    return {
      success: true,
      providerReference,
      status: 'COMPLETED',
      rawResponse: { mode: 'manual_completion' }
    };
  }

  public async cancelPayout(providerReference: string): Promise<boolean> {
    return true;
  }
}

export class PayoutProviderRegistry {
  private static providers: Map<string, PayoutProviderInterface> = new Map([
    ['sandbox', new SandboxPayoutAdapter()],
    ['manual', new ManualPayoutProvider()]
  ]);

  public static getProvider(providerKey: string = 'sandbox'): PayoutProviderInterface {
    return this.providers.get(providerKey.toLowerCase()) || this.providers.get('sandbox')!;
  }
}
