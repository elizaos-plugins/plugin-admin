import { Action, Memory, State, UUID } from '@elizaos/core';
import { AdminService } from '../services/admin';

export const listAllUsersAction: Action = {
  name: 'LIST_ALL_USERS',
  description: 'Return a list of all users/entities known to the agent globally.',
  examples: [
    [
      { 
        name: 'user', 
        content: { text: 'List all users' } 
      },
      { 
        name: 'assistant', 
        content: { 
          text: 'Found 12 users:\n\n1. Alice - ID: abc123...\n2. Bob - ID: def456...\n3. Charlie - ID: ghi789...' 
        } 
      }
    ]
  ],
  validate: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) return false;
    
    const text = message.content?.text?.toLowerCase() || '';
    return (text.includes('list') || text.includes('show')) && 
           (text.includes('users') || text.includes('entities') || text.includes('everyone'));
  },
  handler: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) {
      return {
        text: '❌ Admin privileges required to list users.',
        success: false
      };
    }

    try {
      // Get all unique entity IDs from memories
      const memories = await runtime.getMemories({
        tableName: 'memories',
        agentId: runtime.agentId,
        count: 1000 // Get more to ensure we capture all unique users
      });

      // Extract unique entity IDs
      const entityIds = new Set<string>();
      for (const memory of memories) {
        if (memory.entityId && memory.entityId !== runtime.agentId) {
          entityIds.add(memory.entityId);
        }
      }

      // Get entity details
      const entities = await runtime.getEntitiesByIds(Array.from(entityIds) as UUID[]);

      if (!entities || entities.length === 0) {
        return {
          text: 'No users found in the system.',
          success: true
        };
      }

      // Build response text
      let responseText = `👥 **Found ${entities.length} users:**\n\n`;
      
      entities.slice(0, 20).forEach((entity, idx) => {
        const primaryName = entity.names?.[0] || 'Unknown';
        const id = entity.id || 'no-id';
        responseText += `${idx + 1}. **${primaryName}** - ID: ${id.slice(0, 8)}...\n`;
      });

      if (entities.length > 20) {
        responseText += `\n... and ${entities.length - 20} more users.`;
      }

      return {
        text: responseText,
        data: {
          totalUsers: entities.length,
          users: entities.map(e => ({
            id: e.id,
            names: e.names || [],
            metadata: e.metadata || {}
          }))
        },
        success: true
      };
    } catch (error) {
      runtime.logger.error('[plugin-admin] Error in listAllUsers:', error);
      return {
        text: '❌ Error fetching users. Please check the logs.',
        success: false
      };
    }
  },
}; 