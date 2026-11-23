# Cindercord

Equicord-style plugins and themes for **Discord Phoenix**, the new Discord app Discord is quietly rebuilding in Rust.

> [!CAUTION]
> **Work in progress.** There's nothing to install yet. The pieces below are being built and tested on a real phone right now. Hit **Watch** if you want to know when that changes, and don't open an issue asking when it's done. It's done when it's done.

**[What it is](#what-is-this)** · **[Status](#status)** · **[What carries over](#what-carries-over-from-equicord)** · **[Warnings](#before-you-get-excited)** · **[Credits](#credits)** · **[License](#license)**

---

## What is this?

Discord is rewriting its app from scratch in Rust. They call it **Phoenix**. A working copy of it ships hidden inside the Android alpha (356.7) behind a switch only Discord staff can flip. The desktop version hasn't leaked, so for now this is **Android only**.

Phoenix isn't a web page like the desktop app, so Equicord, Vencord and every CSS theme can't touch it. Cindercord is the bridge:

- **Equicord translator.** Equicord plugins run on Phoenix with little or no change. Your plugin asks for "the current user", "send a message" or "a slash command", and Cindercord quietly hands it the Phoenix version.
- **Plugin drawer.** A "Browse plugins" page inside Discord's own settings. Tap **Install** and it's on. No rebuilding the app, no restarting.
- **Theme converter.** Takes a desktop theme and repaints Phoenix with its colours.

It's built on top of [phoenix-unlock](https://github.com/mantikafasi/phoenix-unlock), which does the hard part of opening Phoenix up and running plugins in it.

## Status

| Piece | Where it's at |
|---|---|
| Equicord translator | ✅ Working. Equicord's **ClearURLs** runs on a real phone with zero changes to its code. |
| Plugin drawer | 🔨 Being built. |
| Theme converter | 🔜 Planned. Colours first. |
| First batch of ported plugins | 🔜 Planned. MessageLogger, FakeNitro, ClearURLs, SilentTyping, NoTrack, Translate, ReviewDB, NoProfileThemes, MessageLatency, MoreCommands, TextReplace, ViewRaw, Experiments, RelationshipNotifier, VoiceJoinMessages. |
| Installer | 🔜 Planned. One file, no command line. |

## What carries over from Equicord

Out of Equicord's 418 plugins and add-ons, about **159** look portable. The rest mostly depend on the desktop app itself, or work by rewriting Discord's web code, which Phoenix doesn't have.

Themes carry over **in part**:

| Part of a theme | On Phoenix |
|---|---|
| Colours | ✅ Yes |
| Background image | 🟡 Probably |
| Rounded corners, spacing, hidden bits | ❌ Not automatically |
| Custom fonts | ❌ No, fonts are built into the app |

## Before you get excited

> [!WARNING]
> Client mods break [Discord's Terms of Service](https://discord.com/terms), and Phoenix is an unreleased alpha on top of that. Things will break when Discord updates it. **Use an alt account.** If losing your main would ruin your week, this isn't for you yet.

> [!IMPORTANT]
> Cindercord isn't made by or affiliated with Discord, Equicord or phoenix-unlock. Don't bother them about it. Problems go in [this repo's issues](https://github.com/LostMorality/Cindercord/issues) once there's something to have problems with.

## Credits

- [phoenix-unlock](https://github.com/mantikafasi/phoenix-unlock) (MIT): the loader and plugin runtime Cindercord builds on.
- [Equicord](https://github.com/Equicord/Equicord) (GPL-3.0): the plugins being ported, and the API the translator copies.

## License

[GPL-3.0-or-later](LICENSE), same as Equicord, since Cindercord carries Equicord's plugin code.
