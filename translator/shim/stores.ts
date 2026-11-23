// Discord flux stores, backed by Phoenix's SQLite cache (phoenix.stores.sql, async/read-only)
// and warmed live from gateway events. Equicord code calls these synchronously, so getters
// read in-memory caches; anything not yet cached returns undefined. Call warm() at startup.
//
// NOTE (partial): the cache.sqlite schema is only partly known (study open question), so SQL
// lookups are best-effort. Live caching from messageCreate covers the common case (authors and
// channels you can see). Plugins that need a full member/guild graph are rated Medium/Hard.

import { FluxDispatcher, FluxStore } from "./flux";
import { state } from "./state";

type User = Record<string, unknown> & { id: string; username?: string };
type Channel = Record<string, unknown> & { id: string; guild_id?: string; type?: number };

const users = new Map<string, User>();
const channels = new Map<string, Channel>();
const guilds = new Map<string, Record<string, unknown> & { id: string }>();
let currentUser: User | undefined;

export async function warm() {
  try {
    const me = await phoenix.discord.get("/users/@me");
    if (me.ok) {
      currentUser = me.json<User>();
      if (currentUser?.id) users.set(currentUser.id, currentUser);
    }
  } catch (e) {
    phoenix.log.warn("[stores] could not warm current user:", String(e));
  }
  // Live-cache authors and channels from incoming messages.
  FluxDispatcher.subscribe("MESSAGE_CREATE", (a) => {
    const m = a as { author?: User; channel_id?: string; guild_id?: string };
    if (m.author?.id) users.set(m.author.id, { ...users.get(m.author.id), ...m.author });
    if (m.channel_id) {
      channels.set(m.channel_id, { id: m.channel_id, guild_id: m.guild_id, ...channels.get(m.channel_id) });
    }
  });
}

export const UserStore = Object.assign(new FluxStore(), {
  getUser: (id: string) => users.get(id),
  getCurrentUser: () => currentUser,
  getUsers: () => Object.fromEntries(users),
  forEach: (fn: (u: User) => void) => users.forEach(fn),
});

export const ChannelStore = Object.assign(new FluxStore(), {
  getChannel: (id: string) => channels.get(id),
  getDMFromUserId: (_id: string) => undefined as Channel | undefined,
  hasChannel: (id: string) => channels.has(id),
});

export const GuildStore = Object.assign(new FluxStore(), {
  getGuild: (id: string) => guilds.get(id),
  getGuilds: () => Object.fromEntries(guilds),
  getGuildCount: () => guilds.size,
});

export const SelectedChannelStore = Object.assign(new FluxStore(), {
  getChannelId: () => state.selectedChannelId ?? undefined,
  getLastSelectedChannelId: () => state.selectedChannelId ?? undefined,
  getCurrentlySelectedChannelId: () => state.selectedChannelId ?? undefined,
});

export const SelectedGuildStore = Object.assign(new FluxStore(), {
  getGuildId: () => state.selectedGuildId ?? undefined,
  getLastSelectedGuildId: () => state.selectedGuildId ?? undefined,
});

export const RelationshipStore = Object.assign(new FluxStore(), {
  isFriend: (_id: string) => false,
  isBlocked: (_id: string) => false,
  getRelationshipType: (_id: string) => 0,
  getFriendIDs: () => [] as string[],
});

export const GuildMemberStore = Object.assign(new FluxStore(), {
  getMember: (_guildId: string, _userId: string) => undefined,
  getNick: (_guildId: string, _userId: string) => undefined as string | undefined,
});

export const MessageStore = Object.assign(new FluxStore(), {
  getMessage: (_channelId: string, _id: string) => undefined,
  getMessages: (_channelId: string) => ({ toArray: () => [] as unknown[] }),
});

export const PermissionStore = Object.assign(new FluxStore(), {
  can: (_perm: bigint, _channel: unknown) => false,
});

export const PresenceStore = Object.assign(new FluxStore(), {
  getStatus: (_id: string) => "offline",
});

// Raw SQL escape hatch for plugins/stores that want to query the cache themselves.
export function sql<Row = Record<string, unknown>>(query: string, ...args: unknown[]) {
  return phoenix.stores.sql<Row>(query, ...args);
}

// Warm once when this module is first pulled into a plugin bundle.
let warmed = false;
if (!warmed) {
  warmed = true;
  void warm();
}
