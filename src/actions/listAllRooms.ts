import { Action, Memory, State, UUID } from '@elizaos/core';
import { AdminService } from '../services/admin';

export const listAllRoomsAction: Action = {
  name: 'LIST_ALL_ROOMS',
  description: 'Return a list of all chat rooms/channels known to the agent globally.',
  examples: [
    [
      { 
        name: 'user', 
        content: { text: 'List all rooms' } 
      },
      { 
        name: 'assistant', 
        content: { 
          text: 'Found 5 rooms:\n\n1. general - ID: abc123...\n2. dev-chat - ID: def456...\n3. support - ID: ghi789...' 
        } 
      }
    ]
  ],
  validate: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) return false;
    
    const text = message.content?.text?.toLowerCase() || '';
    return (text.includes('list') || text.includes('show')) && 
           (text.includes('rooms') || text.includes('channels'));
  },
  handler: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) {
      return {
        text: '❌ Admin privileges required to list rooms.',
        success: false
      };
    }

    try {
      // Get unique room IDs from memories
      const memories = await runtime.getMemories({
        tableName: 'memories',
        agentId: runtime.agentId,
        count: 1000
      });

      // Extract unique room IDs
      const roomIds = new Set<string>();
      for (const memory of memories) {
        if (memory.roomId) {
          roomIds.add(memory.roomId);
        }
      }

      // Get room details
      const rooms = await runtime.getRoomsByIds(Array.from(roomIds) as UUID[]);

      if (!rooms || rooms.length === 0) {
        return {
          text: 'No rooms found in the system.',
          success: true
        };
      }

      // Build response text
      let responseText = `🏠 **Found ${rooms.length} rooms:**\n\n`;
      
      rooms.slice(0, 20).forEach((room, idx) => {
        const roomName = room.name || `Room ${room.id.slice(0, 8)}`;
        responseText += `${idx + 1}. **${roomName}** - ID: ${room.id.slice(0, 8)}...\n`;
        if (room.source) {
          responseText += `   Source: ${room.source}\n`;
        }
      });

      if (rooms.length > 20) {
        responseText += `\n... and ${rooms.length - 20} more rooms.`;
      }

      return {
        text: responseText,
        data: {
          totalRooms: rooms.length,
          rooms: rooms.map(r => ({
            id: r.id,
            name: r.name || null,
            source: r.source,
            type: r.type,
            metadata: r.metadata || {}
          }))
        },
        success: true
      };
    } catch (error) {
      runtime.logger.error('[plugin-admin] Error in listAllRooms:', error);
      return {
        text: '❌ Error fetching rooms. Please check the logs.',
        success: false
      };
    }
  },
}; 