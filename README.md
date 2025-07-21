# @elizaos/plugin-admin

> ⚠️  **Secure by default** – The plugin is a no-op until admin privileges are explicitly unlocked by providing the correct `ADMIN_PASSWORD`.

A privileged plugin for ElizaOS that allows power-users to inspect and query **global** agent data that is normally sandboxed to the active room/channel.

## Features

| Capability | Action | Description |
|------------|--------|-------------|
| Elevate privileges | `ELEVATE_PRIVILEGE` | Validate the admin password and unlock all other actions/providers |
| Daily activity report | `GLOBAL_REPORT` | Aggregate message counts per room for a given day |
| List all users | `LIST_ALL_USERS` | Returns every user the agent knows about |
| List all rooms | `LIST_ALL_ROOMS` | Returns all chat rooms/channels |
| Global message search | `SEARCH_MESSAGES` | Search across **all** messages globally |
| User audit | `USER_AUDIT` | Generate detailed activity report for a specific user |

Once unlocked, the `GLOBAL_CONTEXT` provider injects a rolling summary of the last 50 messages across every room into the LLM prompt, enabling holistic responses like "Summarise everything that happened today".

## Installation

```bash
bun install @elizaos/plugin-admin
```

Add the plugin **after** your bootstrap/default plugins:

```ts
import { adminPlugin } from '@elizaos/plugin-admin';

agent.registerPlugin(adminPlugin);
```

## Configuration

| Env Var | Required | Description |
|---------|----------|-------------|
| `ADMIN_PASSWORD` | **Yes** | The plaintext password that will grant admin privileges |

**Never** commit the password – store it in your project‐local `.env`.

```env
ADMIN_PASSWORD=super-secret-value
```

## Usage

### 1. Elevate privileges

When chatting with the agent:

```
User → "Elevate my privileges to admin. Password: super-secret-value"
```

The plugin will execute `ELEVATE_PRIVILEGE` automatically when it detects the pattern:

```json
{
  "action": "ELEVATE_PRIVILEGE",
  "options": { "password": "super-secret-value" }
}
```

On success, the agent responds:

```
✅ Admin privileges granted. You now have access to global commands.
```

All subsequent admin actions & providers become available for the session's lifetime.

### 2. Example queries

```text
"Give me a global report for today."            → GLOBAL_REPORT
"List all users."                               → LIST_ALL_USERS
"List all rooms."                               → LIST_ALL_ROOMS
"Search all messages for 'production outage'."  → SEARCH_MESSAGES { query: "production outage" }
"Audit user abc123."                            → USER_AUDIT { userId: "abc123" }
```

## Actions

### ELEVATE_PRIVILEGE
Unlock admin functionality by providing the correct password.
- Validates against `ADMIN_PASSWORD` environment variable
- Uses SHA-256 hashing for security
- Unlocks all other admin actions once validated

### GLOBAL_REPORT
Generate a summary of all activity across rooms for a specific day.
- Shows total message count
- Lists activity per room
- Defaults to current day, or specify date in format YYYY-MM-DD

### LIST_ALL_USERS
Returns all entities/users known to the agent.
- Shows entity IDs and names
- Limited to 20 in chat response (full data in response object)

### LIST_ALL_ROOMS
Lists all rooms/channels the agent has participated in.
- Shows room names and IDs
- Includes source platform information

### SEARCH_MESSAGES
Search for messages containing specific text across all rooms.
- Case-insensitive search
- Returns up to 10 matching messages with context
- Shows timestamp, room, and entity information

### USER_AUDIT
Generate a detailed audit report for a specific user.
- Total message count and date range
- Room activity breakdown
- Recent message samples
- Requires user/entity ID

## Global Context Provider

When admin privileges are unlocked, the `GLOBAL_CONTEXT` provider automatically injects:
- Summary of last 50 messages across all rooms
- Message counts per room
- Formatted for LLM context understanding

This enables the agent to answer questions like:
- "What happened across all chats today?"
- "Summarize the key discussions from all rooms"
- "Who has been most active today?"

## Security Considerations

1. **Password Hashing** – The plugin only stores a SHA-256 hash in memory. The plaintext password never leaves `process.env`.
2. **Session-based** – Admin privileges are granted per runtime session. Restarting the agent requires re-authentication.
3. **Read-only** – Current actions are *read* queries. If you add write operations, double-check permissions.
4. **Audit logs** – Consider emitting events whenever an admin action runs to keep an audit trail.

## Database Schema

The plugin uses ElizaOS's standard database interface and expects:
- `memories` table for messages
- `entities` table for users
- `rooms` table for channels/rooms

No custom SQL or schema modifications are required.

## Development

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm run build

# Run tests
pnpm test

# Development mode with watch
pnpm run dev
```

## Contributing

When adding new admin actions:
1. Create action in `src/actions/`
2. Check admin privileges in validate & handler
3. Use proper ElizaOS database methods (not raw SQL)
4. Add comprehensive examples
5. Update this README

## License

Apache-2.0
