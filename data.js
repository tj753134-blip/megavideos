// data.js - camada de dados com Supabase + cache em memória
// Regras: usar sempre async/await e desestruturação { data, error }
// Não usar Firebase. Todas as queries usam window.supabaseClient

const DB = {
  _cache: {},
  _useSupabase: typeof window.supabaseClient !== 'undefined'
};

// Dados de exemplo (seed)
const SAMPLE_FILMES = [
  { id:101, titulo:"Super Mario Galaxy Movie", ano:2025, duracao:"105min", rating:8.4, generos:["Animação","Aventura","Família"], audio:"DUB", qualidade:"HD", tipo:"filme" },
  { id:102, titulo:"O Sinal", ano:2024, duracao:"56min", rating:7.8, generos:["Ficção Científica","Thriller"], audio:"DUB", qualidade:"HD", tipo:"filme" },
  { id:103, titulo:"O Sangue de Zeus", ano:2020, duracao:"38min", rating:7.6, generos:["Animação","Fantasia","Ação"], audio:"DUB", qualidade:"HD", tipo:"filme" },
  { id:104, titulo:"O Estúdio", ano:2025, duracao:"36min", rating:8.1, generos:["Comédia","Drama"], audio:"DUB", qualidade:"HD", tipo:"filme" },
  { id:105, titulo:"Dragon Striker", ano:2026, duracao:"105min", rating:8.6, generos:["Animação","Fantasia","Ação"], audio:"DUB", qualidade:"HD", tipo:"filme" }
];

const SAMPLE_SERIES = [
  { id:201, titulo:"A Lenda de Vox Machina", ano:2022, duracao:"26min", rating:8.2, generos:["Animação","Fantasia","Ação"], audio:"DUB", qualidade:"HD", tipo:"serie",
    temporadas:[{ num:1, titulo:"Temporada 1", episodios:[{ num:1, titulo:"Episódio 01", duracao:"26min", url:"", servers:[] },{ num:2, titulo:"Episódio 02", duracao:"26min", url:"", servers:[] } ] }]
  },
  { id:202, titulo:"Rick e Morty", ano:2013, duracao:"22min", rating:9.2, generos:["Animação","Ficção Científica","Comédia"], audio:"DUB", qualidade:"HD", tipo:"serie",
    temporadas:[{ num:1, titulo:"Temporada 1", episodios:[{ num:1, titulo:"Episódio 01 - Piloto", duracao:"22min", url:"", servers:[] } ] }]
  }
];

DB.get = function(key) { return DB._cache[key] !== undefined ? DB._cache[key] : null; };

DB.set = function(key, val) {
  DB._cache[key] = val;
  (async () => { try { await DB._persist(key, val); } catch(e){ console.warn(e); } })();
};

DB.setAsync = async function(key, val) { DB._cache[key] = val; return DB._persist(key, val); };

DB._persist = async function(key, val) {
  if (!DB._useSupabase) {
    try { localStorage.setItem('mshd_' + key, JSON.stringify(val)); } catch (e) {}
    return;
  }
  const sup = window.supabaseClient;
  const tables = ['filmes','series','pedidos','users','hero','config','comments'];
  try {
    if (key === 'meta') {
      const entries = Object.keys(val || {}).map(k => ({ key:k, value: val[k] }));
      if (entries.length) {
        const { error } = await sup.from('meta').upsert(entries);
        if (error) throw error;
      }
      return;
    }
    if (tables.includes(key)) {
      // for comments we accept an object keyed by content_id
      let rows = val;
      if (key === 'comments' && val && !Array.isArray(val)) {
        rows = Object.keys(val).flatMap(cid => (val[cid] || []).map(r => ({ ...r, content_id: cid })));
      }
      // delete all then insert (simple approach)
      const { error: delErr } = await sup.from(key).delete().neq('id', -1);
      if (delErr) console.warn('delete existing', key, delErr);
      if (Array.isArray(rows) && rows.length) {
        const { error } = await sup.from(key).insert(rows);
        if (error) throw error;
      }
      return;
    }
  } catch (e) { console.error('DB._persist error', e); throw e; }
};

DB.init = async function() {
  // load from localStorage if present
  try {
    ['filmes','series','pedidos','users','hero','config','comments','mylist','initialized'].forEach(k => {
      try { const v = localStorage.getItem('mshd_' + k); if (v) DB._cache[k] = JSON.parse(v); } catch (e) {}
    });
  } catch (e) {}

  if (!DB._useSupabase) return DB._cache;

  const sup = window.supabaseClient;
  try {
    const { data: sampleCheck, error: chkErr } = await sup.from('filmes').select('id').limit(1);
    if (chkErr) throw chkErr;
    if (!sampleCheck || sampleCheck.length === 0) {
      try { await sup.from('filmes').insert(SAMPLE_FILMES); } catch(e) { console.warn('seed filmes', e); }
      try { await sup.from('series').insert(SAMPLE_SERIES); } catch(e) { console.warn('seed series', e); }
    }

    const tables = ['filmes','series','hero','config','pedidos','users','comments'];
    for (const t of tables) {
      try {
        const { data, error } = await sup.from(t).select('*');
        if (!error) DB._cache[t] = data || [];
        else DB._cache[t] = [];
      } catch (e) { console.warn('load table', t, e); DB._cache[t] = []; }
    }

    // transform comments array -> object keyed by content_id
    const commentsArr = DB._cache['comments'] || [];
    const commentsObj = {};
    if (Array.isArray(commentsArr)) {
      commentsArr.forEach(c => {
        const cid = String(c.content_id || c.contentId || '');
        if (!cid) return;
        commentsObj[cid] = commentsObj[cid] || [];
        commentsObj[cid].push({ id: c.id, author: c.author, text: c.text, date: c.date || new Date().toLocaleDateString('pt-BR') });
      });
    }
    DB._cache['comments'] = commentsObj;

    // meta table -> object entries
    try {
      const { data: metas, error: metasErr } = await sup.from('meta').select('*');
      if (!metasErr && metas) {
        metas.forEach(m => { DB._cache['meta_' + m.key] = m.value; });
      }
    } catch (e) { console.warn('load meta', e); }

    DB._cache['initialized'] = true;
    return DB._cache;
  } catch (e) { console.error('DB.init failed', e); throw e; }
};

DB.addComment = async function(contentId, author, text) {
  if (!DB._useSupabase) throw new Error('Supabase não configurado');
  const sup = window.supabaseClient;
  const payload = { content_id: contentId, author, text, date: new Date().toLocaleDateString('pt-BR') };
  const { data, error } = await sup.from('comments').insert(payload).select();
  if (error) throw error;
  const row = data && data[0] ? data[0] : payload;
  const cid = String(contentId);
  DB._cache['comments'] = DB._cache['comments'] || {};
  DB._cache['comments'][cid] = DB._cache['comments'][cid] || [];
  DB._cache['comments'][cid].unshift({ id: row.id, author: row.author, text: row.text, date: row.date || payload.date });
  return row;
};

const GENEROS = ['Animação','Aventura','Ação','Comédia','Crime','Documentário','Drama','Família','Fantasia','Faroeste','Ficção Científica','Horror','Romance','Thriller'];

window.DB = DB;

// iniciar automaticamente
(async () => { try { if (DB._useSupabase) await DB.init(); } catch (e) { console.error(e); } })();
