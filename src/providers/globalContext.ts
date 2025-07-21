import { Provider, ProviderResult, Memory, State, UUID } from '@elizaos/core';
import { AdminService } from '../services/admin';

/**
 * Injects a summary of global events and messages across all rooms/channels
 * into the LLM prompt when admin privileges are unlocked.
 */
export const globalContextProvider: Provider = {
  name: 'GLOBAL_CONTEXT',
  description: 'Provides a high-level summary of all recent events across all rooms when admin is unlocked.',
  dynamic: true,
  private: true, // Only accessible when admin is unlocked
  get: async (runtime, message: Memory, state: State): Promise<ProviderResult> => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) {
      return {
        values: {},
        data: {},
        text: ''
      };
    }

    try {
      // Fetch last 50 messages across all rooms from memories table
      const memories = await runtime.getMemories({
        tableName: 'memories',
        count: 50,
        agentId: runtime.agentId
      });

      if (!memories.length) {
        return {
          values: {
            globalMessageCount: 0,
            globalRoomCount: 0
          },
          data: {
            messages: []
          },
          text: 'No recent messages found across all rooms.'
        };
      }

      // Group messages by room
      const roomMessages = new Map<string, any[]>();
      for (const msg of memories) {
        if (!roomMessages.has(msg.roomId)) {
          roomMessages.set(msg.roomId, []);
        }
        roomMessages.get(msg.roomId)!.push(msg);
      }

      // Build summary
      let summary = `Global Activity Summary (${memories.length} recent messages across ${roomMessages.size} rooms):\n\n`;
      
      for (const [roomId, msgs] of roomMessages) {
        const roomInfo = await runtime.getRoomsByIds([roomId as UUID]);
        const roomName = roomInfo?.[0]?.name || `Room ${roomId.slice(0, 8)}`;
        
        summary += `=== ${roomName} (${msgs.length} messages) ===\n`;
        for (const msg of msgs.slice(0, 5)) { // Show max 5 messages per room
          const timestamp = new Date(msg.createdAt || 0).toISOString();
          const text = msg.content?.text || '[No text]';
          summary += `[${timestamp}] Entity ${msg.entityId.slice(0, 8)}: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}\n`;
        }
        if (msgs.length > 5) {
          summary += `... and ${msgs.length - 5} more messages\n`;
        }
        summary += '\n';
      }

      return {
        values: {
          globalMessageCount: memories.length,
          globalRoomCount: roomMessages.size
        },
        data: {
          recentGlobalMessages: memories.slice(0, 10),
          roomsSummary: Array.from(roomMessages.entries()).map(([roomId, msgs]) => ({
            roomId,
            messageCount: msgs.length
          }))
        },
        text: summary
      };
    } catch (error) {
      runtime.logger.error('[plugin-admin] Error in globalContextProvider:', error);
      return {
        values: {},
        data: {},
        text: 'Error fetching global context.'
      };
    }
  },
}; 