# ENCLAVE-LSPD

Everything for the LSPD Discord server, self-contained: one bot identity
("EN | LSPD BOT#3043"), three processes sharing its token.

| | Handles |
| --- | --- |
| `lspd-welcome-bot/` | Welcome images when a member joins |
| `logs-bot/` | Join/leave/moderation/audit logs |
| `tickets-bot/` | The support-ticket system |

All three run under the same `DISCORD_TOKEN`/`GUILD_ID` in `/etc/lspd-bot.env`
on the server — separate Node processes, one Discord application, so members
only ever see one bot.

## Deploying

Fresh server (or to migrate `/opt/lspd-bot` from a previous checkout):

```bash
sudo bash deploy/install.sh
```

See [`deploy/install.sh`](deploy/install.sh) for what it does and the
steps it prints when it finishes.

## Each bot's own docs

- [`lspd-welcome-bot/README.md`](lspd-welcome-bot/README.md)
- `logs-bot/config/logs.js` — log-channel-per-type config; `LOG_CHANNEL_ID` /
  `LOG_DISABLE_TYPES` in `.env` override it per-deployment without touching
  that file.
- [`tickets-bot/README.md`](tickets-bot/README.md) — the ticket system's full
  docs (originally from
  [`enclave-tickets-bot`](https://github.com/vzjRR/enclave-tickets-bot),
  which this was forked from for the Enclave RP server).

## Ticket categories

`tickets-bot/src/index.js`'s `DEFAULT_SECTIONS` currently ships a single
`Soon` placeholder section — the real category list hasn't been decided yet.
Once it has, edit that array (and add the Arabic label to
`SECTION_NAME_TRANSLATIONS` alongside it), then re-run `/quick-setup` in
Discord to rebuild the categories.
