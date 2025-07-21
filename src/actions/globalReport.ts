import { Action, Memory, State, UUID } from '@elizaos/core';
import { AdminService } from '../services/admin';

export const globalReportAction: Action = {
  name: 'GLOBAL_REPORT',
  description: 'Generate a summary report of activity across all rooms for a given day',
  examples: [
    [
      { 
        name: 'user', 
        content: { text: 'Give me a global report for today' } 
      },
      { 
        name: 'assistant', 
        content: { 
          text: 'Daily Report:\n📊 Total Messages: 142\n🏠 Active Rooms: 5\n\nTop Rooms:\n1. general (45 messages)\n2. dev-chat (38 messages)\n3. support (25 messages)'
        } 
      }
    ]
  ],
  validate: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) return false;
    
    const text = message.content?.text?.toLowerCase() || '';
    return text.includes('report') && (text.includes('global') || text.includes('daily') || text.includes('today'));
  },
  handler: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) {
      return {
        text: '❌ Admin privileges required for global reports.',
        success: false
      };
    }

    try {
      const text = message.content?.text || '';
      
      // Extract date if specified, otherwise use today
      let date = new Date().toISOString().slice(0, 10);
      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        date = dateMatch[1];
      }
      
      const startTime = new Date(date).getTime();
      const endTime = startTime + 24 * 60 * 60 * 1000;

      // Get all memories for the date range
      const memories = await runtime.getMemories({
        tableName: 'memories',
        agentId: runtime.agentId,
        start: startTime,
        end: endTime
      });

      // Group by room
      const roomStats = new Map<string, number>();
      for (const memory of memories) {
        roomStats.set(memory.roomId, (roomStats.get(memory.roomId) || 0) + 1);
      }

      // Get room details
      const roomIds = Array.from(roomStats.keys()) as UUID[];
      const rooms = await runtime.getRoomsByIds(roomIds);
      const roomMap = new Map(rooms?.map(r => [r.id, r]) || []);

      const topRooms = Array.from(roomStats.entries())
        .map(([roomId, count]) => ({
          roomId,
          roomName: roomMap.get(roomId as UUID)?.name || `Room ${roomId.slice(0, 8)}`,
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Build report text
      let reportText = `📊 **Daily Report for ${date}**\n\n`;
      reportText += `**Summary:**\n`;
      reportText += `• Total Messages: ${memories.length}\n`;
      reportText += `• Active Rooms: ${roomStats.size}\n\n`;
      
      if (topRooms.length > 0) {
        reportText += `**Top ${topRooms.length} Most Active Rooms:**\n`;
        topRooms.forEach((room, idx) => {
          reportText += `${idx + 1}. ${room.roomName} (${room.count} messages)\n`;
        });
      } else {
        reportText += `No activity found for this date.\n`;
      }

      return {
        text: reportText,
        data: {
          date,
          totalMessages: memories.length,
          totalRooms: roomStats.size,
          topRooms
        },
        success: true
      };
    } catch (error) {
      runtime.logger.error('[plugin-admin] Error in globalReport:', error);
      return {
        text: '❌ Error generating report. Please check the logs.',
        success: false
      };
    }
  },
}; 