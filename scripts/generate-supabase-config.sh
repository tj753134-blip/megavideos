#!/bin/sh
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "Aviso: SUPABASE_URL ou SUPABASE_ANON_KEY não definidas."
fi

cat > supabase-config.js <<'HTML'
URL Vídeo — Servidor Alternativo (opcional)

HTML
