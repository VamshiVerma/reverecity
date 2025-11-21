# Police Logs Daily Sync - Edge Function

This Supabase Edge Function automatically syncs new police logs every day at 8:00 AM UTC.

## How It Works

1. **Scrapes** https://reverepolice.org/news/ to discover published PDFs
2. **Checks** database to find unsynced logs
3. **Downloads** PDFs via r.jina.ai
4. **Parses** entries and saves to database
5. **Marks** dates as synced to avoid duplicates

## Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`

### Deploy the Function

```bash
# From project root
cd supabase/functions

# Deploy the function
supabase functions deploy sync-police-logs

# Set up environment variables (if needed)
supabase secrets set SUPABASE_URL=<your-supabase-url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### Enable Cron (Automatic Daily Sync)

The cron schedule is defined in `cron.yml`:
- **Schedule**: Every day at 3:00 PM UTC (10:00 AM EST)
- **Pattern**: `0 15 * * *`

To enable cron:
1. Go to Supabase Dashboard → Edge Functions
2. Find `sync-police-logs` function
3. Click "Enable Cron"
4. Verify the schedule shows "0 15 * * *"

### Manual Testing

You can manually trigger the function to test it:

```bash
# Invoke locally
supabase functions serve sync-police-logs

# In another terminal, test it
curl -X POST http://localhost:54321/functions/v1/sync-police-logs

# Or invoke remotely
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/sync-police-logs \
  -H "Authorization: Bearer <your-anon-key>"
```

## Monitoring

Check the function logs in Supabase Dashboard:
1. Go to Edge Functions → sync-police-logs
2. Click "Logs" tab
3. See sync results and any errors

## Configuration

**Cron Schedule** (edit `cron.yml`):
- Current: `0 8 * * *` (8:00 AM UTC daily)
- Examples:
  - `0 */6 * * *` - Every 6 hours
  - `0 12 * * *` - Noon UTC daily
  - `0 0 * * 1` - Midnight every Monday

**Timezone Note**: Cron uses UTC. Adjust times accordingly for your timezone.
