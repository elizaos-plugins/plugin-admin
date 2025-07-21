import { IAgentRuntime, Service } from '@elizaos/core';
import crypto from 'crypto';

/**
 * AdminService manages the unlocked state for admin privileges once the correct
 * password is provided via the `ELEVATE_PRIVILEGE` action.
 */
export class AdminService extends Service {
  static serviceType = 'ADMIN_SERVICE';
  
  private unlocked = false;
  private readonly passwordHash: string;

  capabilityDescription = 'Admin privilege management service';

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
    if (!runtime) {
      throw new Error('AdminService requires runtime');
    }
    
    const pwd = runtime.getSetting('ADMIN_PASSWORD');
    if (!pwd) {
      runtime.logger.warn(
        '[plugin-admin] ADMIN_PASSWORD environment variable is not set. Elevation will always fail.'
      );
    }
    // Store SHA-256 hash for comparison
    this.passwordHash = pwd ? crypto.createHash('sha256').update(pwd).digest('hex') : '';
  }

  /**
   * Static method to start the service
   */
  static async start(runtime: IAgentRuntime): Promise<Service> {
    return new AdminService(runtime);
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    this.unlocked = false;
  }

  /**
   * Attempt to unlock with the provided password.
   * Returns true on success, false otherwise.
   */
  public unlock(password: string): boolean {
    if (this.unlocked) return true;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash === this.passwordHash && this.passwordHash) {
      this.unlocked = true;
      this.runtime.logger.info('[plugin-admin] Admin privileges unlocked.');
      return true;
    }
    return false;
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }
} 