#!/usr/bin/env bash
#
# One-shot Supabase migration to a NEW project.
#
# Prereqs (once):
#   - Create the new project at https://supabase.com/dashboard  (~2 min to provision)
#   - Have the Supabase CLI:  npm i -g supabase   (or use `npx supabase`)
#
# Run:
#   NEW_PROJECT_REF=xxxxxxxxxxxx ./scripts/migrate-supabase.sh
#
# It will: link the project, push all migrations (schema), deploy all edge
# functions, and set the function secrets. You'll be prompted for secrets so
# nothing sensitive is stored in this file or in git.

set -euo pipefail

SUPABASE="${SUPABASE_CLI:-npx supabase}"

NEW_PROJECT_REF="${NEW_PROJECT_REF:-ckwiryfnnguarcsgiuws}"

echo "==> Logging in (opens browser / paste access token)"
$SUPABASE login

echo "==> Linking project $NEW_PROJECT_REF"
$SUPABASE link --project-ref "$NEW_PROJECT_REF"

echo "==> Pushing database migrations (creates the schema)"
$SUPABASE db push

echo "==> Deploying edge functions"
$SUPABASE functions deploy fetch-weather
$SUPABASE functions deploy populate-insights
$SUPABASE functions deploy process-budget-pdf
$SUPABASE functions deploy sync-police-logs

echo "==> Setting edge-function secrets"
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically — do NOT set them.
read -rsp "WEATHER_API_KEY (blank to skip): " WEATHER_API_KEY; echo
[[ -n "$WEATHER_API_KEY" ]] && $SUPABASE secrets set WEATHER_API_KEY="$WEATHER_API_KEY"

read -rsp "GEMINI_API_KEY (blank to skip): " GEMINI_API_KEY; echo
[[ -n "$GEMINI_API_KEY" ]] && $SUPABASE secrets set GEMINI_API_KEY="$GEMINI_API_KEY"

read -rsp "OPENAI_API_KEY (blank to skip): " OPENAI_API_KEY; echo
[[ -n "$OPENAI_API_KEY" ]] && $SUPABASE secrets set OPENAI_API_KEY="$OPENAI_API_KEY"

echo
echo "==> Done. Next:"
echo "    1. Put the new URL + anon key in .env  (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)"
echo "    2. Regenerate data: run the sync-police-logs function and re-embed the budget PDF."
