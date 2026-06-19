/*
  supabase-config.js (final)
  - Este arquivo usa placehoders que devem ser preenchidos via build/Netlify env.
  - NÃO coloque a `service_role` key aqui. Use-a apenas em backends.

  Como usar (Netlify recomendado):
  - Defina as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_ANON_KEY` no painel Netlify.
  - Adicione um passo de build para gerar este arquivo substituindo os placeholders, por exemplo:

    ```bash
    echo "const SUPABASE_URL='${SUPABASE_URL}';const SUPABASE_ANON_KEY='${SUPABASE_ANON_KEY}';window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);" > supabase-config.js
    ```

  Em ambiente local, você pode exportar as variáveis e executar o mesmo comando antes de servir os arquivos.
*/

// supabase-config.js — configuração cliente Supabase (anon) embutida
// ATENÇÃO: este arquivo contém a anon key para testes locais.
// Em produção, gere este arquivo em tempo de build e NÃO comite chaves.

if (typeof supabase !== 'undefined' && supabase.createClient) {
  try {
    window.supabaseClient = supabase.createClient(
      'https://pqspqlrbjojuriqqmigt.supabase.co',
      'sb_publishable_f_0cKsxEfLg2RyBvV8YXyQ_DKxCQ4Oz'
    );
  } catch (e) { console.error('Erro ao criar supabase client', e); }
} else {
  console.warn('Supabase JS não encontrado. Verifique a inclusão do CDN.');
}

// Segurança: lembrete para não expor a `service_role` key no cliente.
// Use a service_role em funções server-side apenas (Netlify Functions, Cloud Run, etc.).
