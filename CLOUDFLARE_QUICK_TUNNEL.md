# Temporary public demo link

PromptShield runs on your laptop. A Cloudflare Quick Tunnel can temporarily make the local app reachable through a public `trycloudflare.com` URL.

## Start the app and tunnel

1. Start PromptShield with the normal Windows server command from the README and keep that PowerShell window open.
2. Open a second PowerShell window and start the tunnel:

   ```powershell
   & "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8001
   ```

3. Copy the `https://…trycloudflare.com` URL printed by `cloudflared`. Share that public URL, not `http://127.0.0.1:8001`.
4. Before submitting the URL, open it in a private/incognito browser window and confirm the app loads and can complete a prompt check.

## Availability and safety

- This is a temporary tunnel to the app on your laptop, not a hosted deployment. The laptop, PromptShield server, internet connection, and `cloudflared` process must all stay on.
- The URL stops working when the server or tunnel stops. Starting a new Quick Tunnel creates a different random URL, so update any form or message that uses the old one.
- Anyone who has the URL can reach the app. Use only demo data and do not submit real secrets, passwords, API keys, or private customer information.
- This Quick Tunnel is for a short demo or testing session. Cloudflare describes Quick Tunnels as temporary development tunnels and does not provide an uptime guarantee for them.

Cloudflare reference: [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
