import { Action, Memory, State, UUID } from '@elizaos/core';
import { AdminService } from '../services/admin';

export const userAuditAction: Action = {
  name: 'USER_AUDIT',
  description: 'Generate a detailed audit report for a specific user/entity.',
  examples: [
    [
      { 
        name: 'user', 
        content: { text: 'Audit user abc123' } 
      },
      { 
        name: 'assistant', 
        content: { 
          text: 'User Audit Report:\n\n**Entity ID:** abc123...\n**First Seen:** 2024-01-15 10:30\n**Total Messages:** 45\n**Active Rooms:** 3\n**Most Active:** general (25 messages)' 
        } 
      }
    ]
  ],
  validate: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) return false;
    
    const text = message.content?.text?.toLowerCase() || '';
    return text.includes('audit') && (text.includes('user') || text.includes('entity'));
  },
  handler: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) {
      return {
        text: '❌ Admin privileges required for user audits.',
        success: false
      };
    }

    try {
      const text = message.content?.text || '';
      
      // Extract user ID from message
      const idMatch = text.match(/(?:audit\s+(?:user|entity)\s+)?([a-f0-9-]{8,})/i);
      if (!idMatch) {
        return {
          text: 'Please specify a user ID to audit. Example: "Audit user abc123"',
          success: false
        };
      }

      const userId = idMatch[1];
      
      // Get all messages from this user using getMemories instead
      const allMemories = await runtime.getMemories({
        tableName: 'memories',
        agentId: runtime.agentId,
        count: 1000
      });

      // Filter for the specific user
      const memories = allMemories.filter(m => m.entityId === userId);

      if (!memories.length) {
        return {
          text: `No activity found for user ${userId}`,
          success: true
        };
      }

      // Get entity details
      const entities = await runtime.getEntitiesByIds([userId as UUID]);
      const entity = entities?.[0];

      // Analyze activity
      const roomActivity = new Map<string, number>();
      let firstSeen = Infinity;
      let lastSeen = 0;

      for (const memory of memories) {
        const timestamp = memory.createdAt || 0;
        if (timestamp < firstSeen) firstSeen = timestamp;
        if (timestamp > lastSeen) lastSeen = timestamp;
        
        roomActivity.set(memory.roomId, (roomActivity.get(memory.roomId) || 0) + 1);
      }

      // Get room details
      const roomIds = Array.from(roomActivity.keys()) as UUID[];
      const rooms = await runtime.getRoomsByIds(roomIds);
      const roomMap = new Map(rooms?.map(r => [r.id, r]) || []);

      // Sort rooms by activity
      const topRooms = Array.from(roomActivity.entries())
        .map(([roomId, count]) => ({
          roomId,
          roomName: roomMap.get(roomId as UUID)?.name || `Room ${roomId.slice(0, 8)}`,
          count
        }))
        .sort((a, b) => b.count - a.count);

      // Build audit report
      let reportText = `📊 **User Audit Report**\n\n`;
      reportText += `**Entity ID:** ${userId}\n`;
      reportText += `**Name(s):** ${entity?.names?.join(', ') || 'Unknown'}\n`;
      reportText += `**First Seen:** ${new Date(firstSeen).toISOString()}\n`;
      reportText += `**Last Seen:** ${new Date(lastSeen).toISOString()}\n`;
      reportText += `**Total Messages:** ${memories.length}\n`;
      reportText += `**Active Rooms:** ${roomActivity.size}\n\n`;
      
      reportText += `**Room Activity:**\n`;
      topRooms.slice(0, 5).forEach((room, idx) => {
        reportText += `${idx + 1}. ${room.roomName} (${room.count} messages)\n`;
      });

      // Add recent messages sample
      reportText += `\n**Recent Messages:**\n`;
      memories.slice(0, 5).forEach((msg, idx) => {
        const timestamp = new Date(msg.createdAt || 0).toISOString().slice(0, 16);
        const text = msg.content?.text || '[No text]';
        const preview = text.length > 80 ? text.slice(0, 80) + '...' : text;
        reportText += `${idx + 1}. [${timestamp}] "${preview}"\n`;
      });

      return {
        text: reportText,
        data: {
          userId,
          entity,
          totalMessages: memories.length,
          firstSeen: new Date(firstSeen).toISOString(),
          lastSeen: new Date(lastSeen).toISOString(),
          roomActivity: topRooms
        },
        success: true
      };
    } catch (error) {
      runtime.logger.error('[plugin-admin] Error in userAudit:', error);
      return {
        text: '❌ Error generating user audit. Please check the logs.',
        success: false
      };
    }
  },
}; 