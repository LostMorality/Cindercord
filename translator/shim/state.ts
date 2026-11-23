// Small shared mutable state the shims update as the user moves around the app.
// Phoenix has no store for "the open channel", so we track it from the UI contexts that
// carry a channelId (send interceptor, message accessories, commands).

export const state: { selectedChannelId: string | null; selectedGuildId: string | null } = {
  selectedChannelId: null,
  selectedGuildId: null,
};

export function noteChannel(channelId: string | null, guildId?: string | null) {
  if (channelId) state.selectedChannelId = channelId;
  if (guildId !== undefined) state.selectedGuildId = guildId;
}
