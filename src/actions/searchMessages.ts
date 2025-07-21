import { Action, Memory, State } from '@elizaos/core';
import { AdminService } from '../services/admin';

export const searchMessagesAction: Action = {
  name: 'SEARCH_MESSAGES',
  description: 'Search for messages across all rooms globally.',
  examples: [
    [
      { 
        name: 'user', 
        content: { text: 'Search all messages for "production outage"' } 
      },
      { 
        name: 'assistant', 
        content: { 
          text: 'Found 3 messages matching "production outage":\n\n1. [2024-01-15 14:32] Entity abc123: "We have a production outage affecting the API"\n2. [2024-01-15 14:35] Entity def456: "I\'m investigating the production outage now"' 
        } 
      }
    ]
  ],
  validate: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) return false;
    
    const text = message.content?.text?.toLowerCase() || '';
    return text.includes('search') && (text.includes('message') || text.includes('all'));
  },
  handler: async (runtime, message: Memory, state?: State) => {
    const admin = runtime.getService<AdminService>('ADMIN_SERVICE');
    if (!admin || !admin.isUnlocked()) {
      return {
        text: '❌ Admin privileges required for global search.',
        success: false
      };
    }

    try {
      const text = message.content?.text || '';
      
      // Extract search query from message
      const queryMatch = text.match(/search\s+(?:all\s+)?(?:messages?\s+)?(?:for\s+)?["']?([^"']+)["']?/i);
      if (!queryMatch) {
        return {
          text: 'Please specify what to search for. Example: "Search all messages for production issue"',
          success: false
        };
      }

      const searchQuery = queryMatch[1].trim();
      
      // Get all memories (with a reasonable limit)
      const memories = await runtime.getMemories({
        tableName: 'memories',
        agentId: runtime.agentId,
        count: 500
      });

      // Filter memories that contain the search query
      const searchLower = searchQuery.toLowerCase();
      const matches = memories.filter(mem => 
        mem.content?.text?.toLowerCase().includes(searchLower)
      );

      if (matches.length === 0) {
        return {
          text: `No messages found containing "${searchQuery}"`,
          success: true
        };
      }

      // Sort by timestamp (newest first)
      matches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Get room details for context
      const roomIds = [...new Set(matches.map(m => m.roomId))];
      const rooms = await runtime.getRoomsByIds(roomIds);
      const roomMap = new Map(rooms?.map(r => [r.id, r]) || []);

      // Build response text
      let responseText = `🔍 **Found ${matches.length} messages matching "${searchQuery}":**\n\n`;
      
      matches.slice(0, 10).forEach((match, idx) => {
        const timestamp = match.createdAt 
          ? new Date(match.createdAt).toISOString().replace('T', ' ').slice(0, 16)
          : 'Unknown time';
        const roomName = roomMap.get(match.roomId)?.name || `Room ${match.roomId.slice(0, 8)}`;
        const text = match.content?.text || '[No text]';
        const preview = text.length > 100 ? text.slice(0, 100) + '...' : text;
        
        responseText += `${idx + 1}. **[${timestamp}]** in ${roomName}\n`;
        responseText += `   Entity ${match.entityId.slice(0, 8)}: "${preview}"\n\n`;
      });

      if (matches.length > 10) {
        responseText += `... and ${matches.length - 10} more messages.`;
      }

      return {
        text: responseText,
        data: {
          query: searchQuery,
          totalResults: matches.length,
          results: matches.slice(0, 20).map(m => ({
            id: m.id,
            roomId: m.roomId,
            entityId: m.entityId,
            content: m.content,
            createdAt: m.createdAt
          }))
        },
        success: true
      };
    } catch (error) {
      runtime.logger.error('[plugin-admin] Error in searchMessages:', error);
      return {
        text: '❌ Error searching messages. Please check the logs.',
        success: false
      };
    }
  },
}; 