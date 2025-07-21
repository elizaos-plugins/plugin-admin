import { Action, Memory, State } from '@elizaos/core';
import { AdminService } from '../services/admin';
import { z } from 'zod';

const paramsSchema = z.object({
  password: z.string().describe('The admin password'),
});

/**
 * Elevate privileges by providing the ADMIN_PASSWORD value. If successful, the
 * AdminService is unlocked enabling all other admin actions & providers.
 */
export const elevatePrivilegeAction: Action = {
  name: 'ELEVATE_PRIVILEGE',
  description: 'Elevate your privileges to admin by providing the admin password.',
  examples: [
    [
      { 
        name: 'user', 
        content: { text: 'Elevate my privileges to admin. Password: super-secret-123' } 
      },
      { 
        name: 'assistant', 
        content: { text: 'Admin privileges granted.' } 
      }
    ]
  ],
  validate: async (runtime, message: Memory, state?: State) => {
    // Check if message contains "elevate" and "admin" keywords
    const text = message.content?.text?.toLowerCase() || '';
    return text.includes('elevate') && (text.includes('admin') || text.includes('privilege'));
  },
  handler: async (runtime, message: Memory, state?: State) => {
    const text = message.content?.text || '';
    
    // Extract password from message - look for "password:" pattern
    const passwordMatch = text.match(/password:\s*(\S+)/i);
    if (!passwordMatch) {
      return {
        text: 'Please provide the admin password in the format: "password: YOUR_PASSWORD"',
        success: false
      };
    }

    const password = passwordMatch[1];
    const service = runtime.getService<AdminService>('ADMIN_SERVICE');
    
    if (!service) {
      return {
        text: 'Admin service not available.',
        success: false
      };
    }

    const success = service.unlock(password);
    
    return {
      text: success 
        ? '✅ Admin privileges granted. You now have access to global commands.' 
        : '❌ Invalid password. Admin privileges denied.',
      success
    };
  },
}; 