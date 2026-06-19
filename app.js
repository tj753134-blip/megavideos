// ===================== APP STATE =====================
let currentPage = 'home';
let heroSlides = [];
let heroIdx = 0;
let heroTimer = null;
let currentList = { type: 'filmes', genero: 'todos', page: 1, perPage: 18 };
let currentDetail = null;
let currentUser = null;
let listData = [];

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  // mostrar overlay de loading global
  const loadingEl = document.getElementById('app-loading');
  if (loadingEl) loadingEl.style.display = 'flex';

  // inicializar DB (carregar cache)
  try {
    if (window.DB && window.DB.init) await window.DB.init();
  } catch (e) {
    console.error('Falha ao inicializar dados:', e);
    if (loadingEl) loadingEl.style.display = 'none';
    const root = document.body;
    root.innerHTML = '<div style="padding:40px;color:#fff;background:#111;min-height:100vh">Erro ao carregar dados. Veja console.</div>';
    return;
  }

  // esconder loading e renderizar site
  if (loadingEl) loadingEl.style.display = 'none';
  currentUser = DB.get('session') || null;
  // auth listener (apenas para atualizações de sessão)
  if (typeof window.supabaseClient !== 'undefined') {
    const sup = window.supabaseClient;
    sup.auth.onAuthStateChange(async (event, session) => {
      const user = session && session.user ? session.user : null;
      if (user) {
        // carregar perfil do cache ou criar
        try {
          let profile = (DB.get('users') || []).find(u => u.id === user.id) || null;
          if (!profile) {
            profile = { id: user.id, name: user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Usuário'), email: user.email, created: new Date().toISOString() };
            // inserir profile na tabela users
            try { const { error } = await sup.from('users').upsert(profile); if (error) console.warn(error); } catch (e) { console.warn(e); }
          }
          profile.emailVerified = !!user.email_confirmed_at;
          DB.set('session', profile);
          currentUser = profile;
          if (!profile.emailVerified) showVerificationModal(user.email);
        } catch (e) { console.error('Erro ao processar auth state', e); }
      } else {
        DB.set('session', null);
        currentUser = null;
      }
      updateUserUI();
    });
  }

  // carregar e renderizar conteúdo inicial
  loadHero();
  loadHomeSections();
  if (window.location.hash) handleHash(window.location.hash);
});

window.addEventListener('hashchange', () => handleHash(window.location.hash));

function handleHash(hash) {
  if (!hash || hash === '#') { showPage('home'); return; }
  const parts = hash.replace('#','').split('/');
  if (parts[0] === 'detail') showDetail(parseInt(parts[1]));
  else if (parts[0] === 'list') filterContent(parts[1], parts[2] || 'todos');
  else if (parts[0] === 'play') playContent(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]));
}

// ===================== PAGES =====================
function showPage(name) {
  ['home','list','detail','pedidos','search','player'].forEach(p => {
    document.getElementById('page-' + p).style.display = 'none';
  });
  document.getElementById('page-' + name).style.display = 'block';
  currentPage = name;
  window.scrollTo(0, 0);
}

// ===================== HERO =====================
function loadHero() {
  const heroData = DB.get('hero') || [];
  const filmes = DB.get('filmes') || (typeof SAMPLE_FILMES !== 'undefined' ? SAMPLE_FILMES : []);
  const series = DB.get('series') || (typeof SAMPLE_SERIES !== 'undefined' ? SAMPLE_SERIES : []);
  heroSlides = heroData.map(h => {
    const content = h.content_type === 'serie'
      ? series.find(s => s.id === h.content_id)
      : filmes.find(f => f.id === h.content_id);
    return { ...h, content };
  }).filter(h => h.content);

  if (!heroSlides.length) {
    const all = [...filmes.slice(0,2), ...series.slice(0,1)];
    heroSlides = all.map(c => ({ titulo: c.titulo, subtitulo: c.titulo_orig, content: c, content_id: c.id, content_type: c.tipo }));
  }

  renderHero();
  startHeroTimer();
}

function renderHero() {
  const slidesEl = document.getElementById('hero-slides');
  const dotsEl = document.getElementById('hero-dots');
  const contentEl = document.getElementById('hero-content');

  slidesEl.innerHTML = heroSlides.map((s, i) => `
    <div class="hero-slide ${i === heroIdx ? 'active' : ''}" style="background-image: url('${s.content.backdrop || ''}'); background-color: #0d1b2e;"></div>
  `).join('');

  dotsEl.innerHTML = heroSlides.map((_, i) => `
    <div class="hero-dot ${i === heroIdx ? 'active' : ''}" onclick="setSlide(${i})"></div>
  `).join('');

  const s = heroSlides[heroIdx];
  const c = s.content;
  contentEl.innerHTML = `
    <div class="hero-badge">${c.audio || 'DUB'} • ${c.qualidade || 'HD'}</div>
    <h2>${c.titulo}</h2>
    <div class="hero-meta">
      <span>${c.ano}</span>
      <span>${c.duracao}</span>
      <span class="rating">★ ${c.rating}</span>
      <span>${(c.generos || []).slice(0,2).join(', ')}</span>
    </div>
    <p class="hero-desc">${c.descricao || ''}</p>
    <div class="hero-btns">
      <button class="btn-primary" onclick="handleHeroPlay(${c.id},'${c.tipo}')"><i class="fas fa-play"></i> ASSISTIR ${c.tipo === 'serie' ? 'SÉRIE' : 'FILME'}</button>
      <button class="btn-outline" onclick="showDetail(${c.id})"><i class="fas fa-bookmark"></i> ADICIONAR À LISTA</button>
    </div>
  `;
}

function handleHeroPlay(id, tipo) {
  if (tipo === 'serie') showDetail(id);
  else playContent(id, 0, 0);
}

function startHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => changeSlide(1), 6000);
}

function changeSlide(dir) {
  heroIdx = (heroIdx + dir + heroSlides.length) % heroSlides.length;
  renderHero();
  startHeroTimer();
}

function setSlide(i) { heroIdx = i; renderHero(); startHeroTimer(); }

// ===================== HOME SECTIONS =====================
function loadHomeSections() {
  const filmes = DB.get('filmes') || (typeof SAMPLE_FILMES !== 'undefined' ? SAMPLE_FILMES : []);
  const series = DB.get('series') || (typeof SAMPLE_SERIES !== 'undefined' ? SAMPLE_SERIES : []);

  renderCardRow('lancamentos-row', [...filmes, ...series].sort((a,b) => (b.ano||0) - (a.ano||0)).slice(0,12));
  renderCardRow('series-row', series.slice(0,12));
  renderCardRow('filmes-row', filmes.slice(0,12));
  const anims = [...filmes, ...series].filter(c => (c.generos || []).map(g=>normalizeStr(g)).includes('animacao')).slice(0,12);
  renderCardRow('animacoes-row', anims);
}

// ===================== CARD RENDERING =====================
function renderCardRow(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(c => cardHTML(c)).join('');
}

function renderCardGrid(containerId, items) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map(c => cardHTML(c)).join('');
}

function cardHTML(c) {
  const thumb = c.poster
    ? `<img src="${c.poster}" alt="${c.titulo}" loading="lazy">`
    : `<div class="placeholder-thumb"><i class="${c.tipo === 'serie' ? 'fas fa-tv' : 'fas fa-film'}"></i><span>${c.titulo}</span></div>`;
  return `
    <div class="card" onclick="showDetail(${c.id})">
      <div class="card-thumb">
        ${thumb}
        <div class="card-badges">
          <span class="badge-dub">${c.audio || 'DUB'}</span>
          <span class="badge-hd">${c.qualidade || 'HD'}</span>
        </div>
        <div class="card-overlay"><div class="play-btn"><i class="fas fa-play"></i></div></div>
      </div>
      <div class="card-info">
        <div class="card-title">${c.titulo}</div>
        <div class="card-meta"><span>${c.ano}</span><span>${c.duracao}</span><span class="star">★ ${c.rating}</span></div>
      </div>
    </div>
  `;
}

// ===================== FILTER / LIST PAGE =====================
async function filterContent(type, genero) {
  currentList = { type, genero, page: 1, perPage: 18 };
  showPage('list');
  // if using Firestore and cache not initialized yet, show loading and retry after init
  if ((DB._useSupabase || DB._useFirestore) && !DB.get('initialized')) {
    const infoEl = document.getElementById('list-filter-info');
    if (infoEl) infoEl.textContent = 'Carregando dados...';
    // attempt to initialize and retry filter when done
    try {
      await DB.init();
      return filterContent(type, genero);
    } catch (e) {
      if (infoEl) infoEl.textContent = 'Erro ao carregar dados.';
      return;
    }
  }

  const filmes = DB.get('filmes') || (typeof SAMPLE_FILMES !== 'undefined' ? SAMPLE_FILMES : []);
  const series = DB.get('series') || (typeof SAMPLE_SERIES !== 'undefined' ? SAMPLE_SERIES : []);
  let data = type === 'filmes' ? filmes : (type === 'series' ? series : [...filmes, ...series]);

  if (genero && genero !== 'todos') {
    // normalize requested genre and try to find canonical label from GENEROS
    const requested = normalizeStr(genero);
    const canon = (typeof GENEROS !== 'undefined' && Array.isArray(GENEROS))
      ? (GENEROS.find(x => normalizeStr(x) === requested) || GENEROS.find(x => normalizeStr(x).includes(requested)) )
      : null;
    const g = canon || genero;
    // match if any genre normalized equals or includes the requested token
    data = data.filter(c => (c.generos || []).some(cg => {
      const n = normalizeStr(cg || '');
      return n === requested || n.includes(requested) || requested.includes(n);
    }));
  }

  listData = data;
  const typeLabel = type === 'filmes' ? 'Filmes' : (type === 'series' ? 'Séries' : 'Conteúdo');
  const generoLabel = genero && genero !== 'todos' ? ` de ${canonLabel(genero)}` : '';
  document.getElementById('list-title').textContent = typeLabel + generoLabel;
  const infoEl = document.getElementById('list-filter-info');
  if (infoEl) {
    if (genero && genero !== 'todos') infoEl.textContent = `Filtrando por: ${canonLabel(genero)} — ${data.length} resultado(s)`;
    else infoEl.textContent = `${data.length} resultado(s)`;
    // trigger highlight animation
    infoEl.classList.remove('filter-highlight');
    // force reflow to restart animation
    void infoEl.offsetWidth;
    infoEl.classList.add('filter-highlight');
    setTimeout(() => infoEl.classList.remove('filter-highlight'), 1200);
  }
  renderListPage();
  window.location.hash = `#list/${type}/${genero}`;
}

function renderListPage() {
  const { page, perPage } = currentList;
  const total = listData.length;
  const totalPages = Math.ceil(total / perPage);
  const slice = listData.slice((page - 1) * perPage, page * perPage);

  const gridEl = document.getElementById('list-grid');
  if (!gridEl) return;
  if (total === 0) {
    gridEl.innerHTML = `<div style="padding:30px;color:#666;text-align:center">Nenhum conteúdo encontrado para esse gênero.</div>`;
    document.getElementById('list-pagination-top').innerHTML = '';
    document.getElementById('list-pagination-bottom').innerHTML = '';
    return;
  }

  renderCardGrid('list-grid', slice);
  document.getElementById('list-pagination-top').innerHTML = paginationHTML(page, totalPages);
  document.getElementById('list-pagination-bottom').innerHTML = paginationHTML(page, totalPages);
}

function paginationHTML(cur, total) {
  if (total <= 1) return '';
  let html = '';
  const range = paginationRange(cur, total);
  if (cur > 1) html += `<button class="page-btn" onclick="goPage(${cur-1})"><i class="fas fa-chevron-left"></i></button>`;
  range.forEach(p => {
    if (p === '...') html += `<span class="page-info">...</span>`;
    else html += `<button class="page-btn ${p === cur ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  });
  if (cur < total) html += `<button class="page-btn" onclick="goPage(${cur+1})"><i class="fas fa-chevron-right"></i></button>`;
  html += `<span class="page-info">Page ${cur} of ${total}</span>`;
  return html;
}

function paginationRange(cur, total) {
  if (total <= 7) return Array.from({length: total}, (_, i) => i+1);
  const r = [1];
  if (cur > 3) r.push('...');
  for (let i = Math.max(2, cur-1); i <= Math.min(total-1, cur+1); i++) r.push(i);
  if (cur < total - 2) r.push('...');
  r.push(total);
  return r;
}

function goPage(p) {
  currentList.page = p;
  renderListPage();
  window.scrollTo(0, 0);
}

function sortList(val) {
  if (val === 'newest') listData.sort((a,b) => b.ano - a.ano);
  else if (val === 'oldest') listData.sort((a,b) => a.ano - b.ano);
  else if (val === 'rating') listData.sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating));
  else if (val === 'az') listData.sort((a,b) => a.titulo.localeCompare(b.titulo));
  currentList.page = 1;
  renderListPage();
}

// ===================== DETAIL PAGE =====================
function showDetail(id) {
  const filmes = DB.get('filmes') || [];
  const series = DB.get('series') || [];
  const content = [...filmes, ...series].find(c => c.id === id);
  if (!content) return;
  currentDetail = content;

  showPage('detail');
  window.location.hash = `#detail/${id}`;

  const isSerie = content.tipo === 'serie';
  const backdrop = content.backdrop || '';
  const poster = content.poster || '';
  const chips = (content.generos || []).map(g => `<span class="chip">${g}</span>`).join('');

  let seasonSection = '';
  if (isSerie && content.temporadas && content.temporadas.length) {
    const firstSeason = content.temporadas[0];
    const seasonOpts = content.temporadas.map((t, i) => `<option value="${i}">${t.titulo}</option>`).join('');
    seasonSection = `
      <div class="seasons-section" id="seasons-section">
        <div class="season-selector-bar">
          <span>SELECIONE A TEMPORADA ➜</span>
          <select class="season-select" onchange="changeSeason(this.value)" id="season-sel">${seasonOpts}</select>
        </div>
        <div class="episodes-list" id="episodes-list"></div>
      </div>
    `;
  }

  const alsoWatch = [...filmes, ...series].filter(c => c.id !== id).sort(() => Math.random() - 0.5).slice(0,8);
  const alsoHTML = alsoWatch.map(c => `<div class="card" style="flex:0 0 130px" onclick="showDetail(${c.id})">${cardInnerHTML(c)}</div>`).join('');

  const comments = (DB.get('comments') || {})[id] || [];
  const commentsHTML = comments.map(cm => `
    <div class="comment-item">
      <div class="comment-author">${escapeHtml(cm.author)}<span>${cm.date}</span></div>
      <div class="comment-text">${escapeHtml(cm.text)}</div>
    </div>
  `).join('') || '<p style="color:#666;font-size:13px">Nenhum comentário ainda. Seja o primeiro!</p>';

  document.getElementById('detail-container').innerHTML = `
    <div style="margin-bottom:20px">
      <button class="player-back" onclick="history.back()"><i class="fas fa-arrow-left"></i> Voltar</button>
    </div>
    <div class="detail-hero">
      ${backdrop ? `<img class="detail-backdrop" src="${backdrop}" alt="${content.titulo}">` : `<div class="detail-backdrop-placeholder"><i class="fas fa-film"></i></div>`}
      <div class="detail-overlay"></div>
      <div class="detail-info-row">
        <div class="detail-poster">
          ${poster ? `<img src="${poster}" alt="${content.titulo}">` : `<div class="poster-placeholder"><i class="fas fa-film"></i></div>`}
        </div>
        <div class="detail-text">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <button class="player-back" onclick="${isSerie ? `showDetail(${id})` : `playContent(${id},0,0)`}" style="font-size:20px;padding:10px;border-radius:50%;width:42px;height:42px;justify-content:center"><i class="fas fa-play"></i></button>
            <button class="detail-actions" onclick="addToList(${id})" style="background:rgba(255,255,255,0.07);color:#ccc;border:1px solid #333;padding:10px;border-radius:50%;width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:16px"><i class="fas fa-plus"></i></button>
            <span style="margin-left:auto;color:#888;font-size:13px;cursor:pointer" onclick="shareContent()"><i class="fas fa-share-alt"></i> Compartilhar</span>
          </div>
          <h1>${content.titulo}</h1>
          <h2>${content.titulo_orig || ''}</h2>
          <div class="detail-meta-row">
            <div class="detail-meta-item"><strong>${content.qualidade || 'HD'}</strong></div>
            <div class="detail-meta-item">${content.ano}</div>
            <div class="detail-meta-item">${content.duracao}</div>
            <div class="detail-meta-item" style="color:#ffd700">★ ${content.rating}/10</div>
          </div>
          <p class="detail-desc">${content.descricao || ''}</p>
          ${content.diretor ? `<div class="detail-cast"><strong>Diretor:</strong> ${content.diretor}</div>` : ''}
          ${content.elenco ? `<div class="detail-cast"><strong>Elenco:</strong> ${content.elenco}</div>` : ''}
          ${content.produtor ? `<div class="detail-cast"><strong>Produtor:</strong> ${content.produtor}</div>` : ''}
          <div class="detail-chips" style="margin-top:14px">${chips}</div>
          ${isSerie ? '' : `<div style="margin-top:16px"><button class="btn-primary" onclick="playContent(${id},0,0)"><i class="fas fa-play"></i> ASSISTIR FILME</button></div>`}
        </div>
      </div>
    </div>
    ${seasonSection}
    <div class="also-watch">
      <h3><i class="fas fa-random"></i> Veja também</h3>
      <div class="also-watch-row">${alsoHTML}</div>
    </div>
    <div class="comments-section">
      <h3><i class="fas fa-comments"></i> DEIXE SEU COMENTÁRIO <span style="color:#888;font-size:13px;font-weight:400">${comments.length} Respostas</span></h3>
      <div class="comment-form">
        <input type="text" id="comment-input" placeholder="Escreva seu comentário...">
        <button onclick="addComment(${id})"><i class="fas fa-paper-plane"></i></button>
      </div>
      <div id="comments-list">${commentsHTML}</div>
    </div>
  `;

  if (isSerie && content.temporadas && content.temporadas.length) {
    renderEpisodes(content, 0);
  }
}

function cardInnerHTML(c) {
  const thumb = c.poster
    ? `<img src="${c.poster}" alt="${c.titulo}" loading="lazy">`
    : `<div class="placeholder-thumb"><i class="${c.tipo === 'serie' ? 'fas fa-tv' : 'fas fa-film'}"></i><span>${c.titulo}</span></div>`;
  return `
    <div class="card-thumb">
      ${thumb}
      <div class="card-badges"><span class="badge-dub">${c.audio || 'DUB'}</span><span class="badge-hd">${c.qualidade || 'HD'}</span></div>
      <div class="card-overlay"><div class="play-btn"><i class="fas fa-play"></i></div></div>
    </div>
    <div class="card-info">
      <div class="card-title">${c.titulo}</div>
      <div class="card-meta"><span>${c.ano}</span><span>${c.duracao}</span></div>
    </div>
  `;
}

function changeSeason(idx) {
  renderEpisodes(currentDetail, parseInt(idx));
}

function renderEpisodes(content, seasonIdx) {
  const season = content.temporadas[seasonIdx];
  if (!season) return;
  const el = document.getElementById('episodes-list');
  if (!el) return;
  el.innerHTML = season.episodios.map((ep, i) => `
    <div class="episode-row">
      <button class="ep-play-btn" onclick="playContent(${content.id}, ${seasonIdx}, ${i})"><i class="fas fa-play"></i></button>
      <span class="ep-title">${ep.titulo}</span>
      <span class="ep-duration">${ep.duracao}</span>
      <button class="ep-download" onclick="showToast('Download iniciado!', 'success')">Baixar</button>
    </div>
  `).join('') || '<p style="color:#666;padding:20px;font-size:14px">Nenhum episódio adicionado ainda.</p>';
}

// ===================== PLAYER =====================
function normalizeVideoUrl(url) {
  // Streamtape: converte /v/ para /e/
  if (url.includes('streamtape.com/v/')) {
    const code = url.match(/streamtape\.com\/v\/([^\/\?]+)/)?.[1];
    if (code) return `https://streamtape.com/e/${code}/`;
  }
  // Mixdrop: converte /f/ para /e/
  if (url.match(/mixdrop\.\w+\/f\//)) {
    const code = url.match(/mixdrop\.\w+\/f\/([^\/\?]+)/)?.[1];
    if (code) return `https://mixdrop.ag/e/${code}`;
  }
  return url;
}

function renderPlayerSource(url) {
  const container = document.getElementById('player-video');
  if (!container) return;

  // wrapper 16:9
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.paddingTop = '56.25%';

  let inner = '';
  const raw = String(url || '').trim();
  const trimmed = normalizeVideoUrl(raw);
  if (!trimmed) {
    inner = `<div class="video-placeholder" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><i class="fas fa-film"></i><p>Nenhum vídeo configurado para este conteúdo.</p><p style="font-size:12px;color:#555">Configure a URL do vídeo no painel admin.</p></div>`;
  } else if (trimmed.startsWith('<iframe')) {
    inner = `<div style="position:absolute;inset:0">${trimmed}</div>`;
  } else if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    const vid = trimmed.includes('youtu.be') ? trimmed.split('/').pop() : new URLSearchParams(trimmed.split('?')[1]).get('v');
    inner = `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen allow="autoplay"></iframe>`;
  } else if (trimmed.includes('drive.google.com')) {
    inner = `<iframe src="${trimmed}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen></iframe>`;
  } else if (trimmed.endsWith('.mp4') || trimmed.match(/\.m3u8($|\?)/)) {
    inner = `<video controls autoplay src="${trimmed}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>`;
  } else if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    inner = `<iframe src="${trimmed}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allowfullscreen></iframe>`;
  } else {
    inner = `<div class="video-placeholder" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><i class="fas fa-film"></i><p>Formato de mídia não suportado.</p></div>`;
  }

  wrapper.innerHTML = inner;
  // atualizar estado atual para possibilitar download/troca de servidor
  try {
    window.__playerState = window.__playerState || {};
    // se for iframe HTML, tentar extrair src
    if (trimmed && trimmed.startsWith('<iframe')) {
      const m = trimmed.match(/src=["']([^"']+)["']/);
      window.__playerState.currentSrc = m ? m[1] : trimmed;
    } else {
      window.__playerState.currentSrc = trimmed;
    }
  } catch (e) {}
  container.innerHTML = '';
  container.appendChild(wrapper);
}

function downloadCurrentVideo() {
  const state = window.__playerState || {};
  let src = state.currentSrc || '';
  // tentar pegar do elemento video se presente
  const videoEl = document.querySelector('#player-video video');
  if ((!src || src === '') && videoEl) src = videoEl.currentSrc || videoEl.src || '';
  if (!src) { showToast('Não há vídeo para baixar', 'error'); return; }

  // casos possíveis: .mp4 direto, .m3u8 (HLS), embed/iframe
  try {
    if (src.includes('.mp4')) {
      const a = document.createElement('a');
      a.href = src;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Download iniciado', 'success');
      return;
    }
    if (src.match(/\.m3u8(\?|$)/)) {
      window.open(src, '_blank');
      showToast('Abrindo playlist HLS em nova aba (use downloader externo)', 'info');
      return;
    }
    // abrir fonte em nova aba para tentativas manuais
    window.open(src, '_blank');
    showToast('Abrindo fonte em nova aba; se não iniciar download, não disponível.', 'info');
  } catch (e) {
    console.error('downloadCurrentVideo error', e);
    showToast('Erro ao iniciar download', 'error');
  }
}

function switchPlayerServer(idx) {
  if (!window.__playerState) return;
  const s = window.__playerState.servers || [];
  if (!s[idx]) return;
  window.__playerState.currentIndex = idx;
  renderPlayerSource(s[idx]);
  // update active button classes
  const btns = document.querySelectorAll('.player-server-btn');
  btns.forEach((b,i) => b.classList.toggle('active', i === idx));
}

function playContent(contentId, seasonIdx, epIdx) {
  const filmes = DB.get('filmes') || [];
  const series = DB.get('series') || [];
  const content = [...filmes, ...series].find(c => c.id === contentId);
  if (!content) return;

  let title = content.titulo;
  let ep = null;

  if (content.tipo === 'serie' && content.temporadas) {
    const season = content.temporadas[seasonIdx];
    if (season && season.episodios[epIdx]) {
      ep = season.episodios[epIdx];
      title += ` - ${season.titulo} - ${ep.titulo}`;
    }
  } else {
    ep = content;
  }

  showPage('player');
  window.location.hash = `#play/${contentId}/${seasonIdx}/${epIdx}`;

  // determine servers: support arrays, JSON strings and fallbacks
  let servers = [];
  if (ep) {
    if (Array.isArray(ep.servers) && ep.servers.length) {
        servers = ep.servers.slice();
    } else if (typeof ep.servers === 'string') {
        try { servers = JSON.parse(ep.servers).filter(Boolean); } catch(e) { servers = [ep.servers]; }
    } else if (ep.url) {
        servers = [ep.url];
    }
  }
  if (!servers.length && content.url_video) {
    servers = [content.url_video];
    if (content.servers) {
        try {
            const s2 = typeof content.servers === 'string' ? JSON.parse(content.servers) : content.servers;
            if (Array.isArray(s2) && s2.length) servers = s2.filter(Boolean);
        } catch(e) {}
    }
  }

  // fallback empty
  if (!servers.length) servers = [''];

  // store state globally for switch
  window.__playerState = { servers, currentIndex: 0 };

  // server buttons (labels legíveis)
  let serverButtonsHTML = '';
  if (servers.length > 1) {
    serverButtonsHTML = `<div class="player-servers">${servers.map((s,i) => `<button class="player-server-btn ${i===0?'active':''}" onclick="switchPlayerServer(${i})">${i===0? 'Servidor 1' : 'Servidor 2'}</button>`).join('')}</div>`;
  }

  // episodes list for series
  let seasonButtons = '';
  if (content.tipo === 'serie' && content.temporadas) {
    const season = content.temporadas[seasonIdx];
    if (season) {
      seasonButtons = `
        <div class="player-episodes">
          <h4>${season.titulo}</h4>
          <div class="player-ep-list">
            ${season.episodios.map((epm, i) => `<button class="player-ep-btn ${i === epIdx ? 'active' : ''}" onclick="playContent(${contentId}, ${seasonIdx}, ${i})">${epm.titulo.split('-')[0].trim()}</button>`).join('')}
          </div>
        </div>
      `;
    }
  }

  document.getElementById('player-container').innerHTML = `
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <button class="player-back" onclick="showDetail(${contentId})"><i class="fas fa-arrow-left"></i> Voltar</button>
    </div>
    <div class="player-title">${title}</div>
    <div id="player-video" class="video-frame"></div>
    <div class="player-info">
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <span style="color:#888;font-size:13px">${content.ano}</span>
        <span style="color:#888;font-size:13px">${content.duracao}</span>
        <span style="color:#ffd700;font-size:13px">★ ${content.rating}</span>
        <span style="color:${content.audio==='DUB'?'#1a8cff':'#888'};font-size:12px;font-weight:700">${content.audio}</span>
      </div>
    </div>
    ${serverButtonsHTML}
    <div style="margin-top:8px"> <button id="player-download-btn" class="btn-outline" onclick="downloadCurrentVideo()"><i class="fas fa-download"></i> Baixar</button> </div>
    ${seasonButtons}
  `;

  // render initial server
  renderPlayerSource(servers[0]);
}

// ===================== SEARCH =====================
function searchContent(query) {
  if (!query || query.trim().length < 2) {
    if (currentPage === 'search') showPage('home');
    return;
  }
  const q = query.toLowerCase();
  const filmes = DB.get('filmes') || [];
  const series = DB.get('series') || [];
  const results = [...filmes, ...series].filter(c =>
    c.titulo.toLowerCase().includes(q) ||
    (c.titulo_orig || '').toLowerCase().includes(q) ||
    (c.generos || []).some(g => g.toLowerCase().includes(q))
  );
  showPage('search');
  document.getElementById('search-title').textContent = `Resultados para "${query}" (${results.length})`;
  renderCardGrid('search-grid', results);
}

// ===================== PEDIDOS =====================
function enviarPedido() {
  const titulo = document.getElementById('pedido-titulo').value.trim();
  const ano = document.getElementById('pedido-ano').value.trim();
  const obs = document.getElementById('pedido-obs').value.trim();
  if (!titulo) { showToast('Digite o título do pedido', 'error'); return; }
  const pedidos = DB.get('pedidos') || [];
  pedidos.unshift({ id: Date.now(), titulo, ano, obs, data: new Date().toLocaleDateString('pt-BR') });
  DB.set('pedidos', pedidos);
  document.getElementById('pedido-titulo').value = '';
  document.getElementById('pedido-ano').value = '';
  document.getElementById('pedido-obs').value = '';
  loadPedidosList();
  showToast('Pedido enviado com sucesso!', 'success');
}

function loadPedidosList() {
  const pedidos = DB.get('pedidos') || [];
  const el = document.getElementById('pedidos-lista');
  if (!el) return;
  el.innerHTML = pedidos.map(p => `
    <div class="pedido-item">
      <h4>${escapeHtml(p.titulo)} ${p.ano ? `(${p.ano})` : ''}</h4>
      <p>${p.obs ? escapeHtml(p.obs) + ' — ' : ''}${p.data}</p>
    </div>
  `).join('') || '<p style="color:#666">Nenhum pedido ainda.</p>';
}

document.addEventListener('DOMContentLoaded', loadPedidosList);

// ===================== COMMENTS =====================
async function addComment(contentId) {
  const input = document.getElementById('comment-input');
  if (!input || !input.value.trim()) return;
  const author = currentUser ? currentUser.name : 'Anônimo';
  const text = input.value.trim();
  try {
    if (DB.addComment) {
      await DB.addComment(contentId, author, text);
    } else {
      const comments = DB.get('comments') || {};
      comments[contentId] = comments[contentId] || [];
      comments[contentId].unshift({ author, text, date: new Date().toLocaleDateString('pt-BR') });
      DB.set('comments', comments);
    }
    input.value = '';
    const list = document.getElementById('comments-list');
    const commentsObj = DB.get('comments') || {};
    const items = commentsObj[contentId] || [];
    if (list) {
      list.innerHTML = items.map(cm => `
        <div class="comment-item">
          <div class="comment-author">${escapeHtml(cm.author)}<span>${cm.date}</span></div>
          <div class="comment-text">${escapeHtml(cm.text)}</div>
        </div>
      `).join('');
    }
    showToast('Comentário adicionado!', 'success');
  } catch (e) {
    console.error('addComment failed', e);
    showToast('Erro ao enviar comentário', 'error');
  }
}

// ===================== AUTH =====================
function showModal(tab) {
  if (typeof window.supabaseClient === 'undefined') {
    showToast('Autenticação desativada: configure Supabase (veja README).', 'error');
    return;
  }
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('modal-auth').classList.add('active');
  switchTab(tab || 'login');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('modal-auth').classList.remove('active');
}

function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
}

async function login() {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-password').value;
  if (typeof window.supabaseClient !== 'undefined') {
    const sup = window.supabaseClient;
      try {
      const { data: signData, error } = await sup.auth.signInWithPassword({ email, password: pass });
      if (error) {
        // show clear message for invalid credentials
        if (error.status === 400) showToast('Email ou senha incorretos', 'error');
        else showToast(error.message || 'Erro ao autenticar', 'error');
        return;
      }
      // verificar se o usuário autenticado é admin e mostrar botão se for
      try {
        const { data: userData, error: userErr } = await sup.auth.getUser();
        if (!userErr && userData && userData.user) {
          const user = userData.user;
          const { data: adm, error: admErr } = await sup.from('admins').select('id').eq('id', user.id).maybeSingle();
          const isAdmin = (!admErr && adm) ? true : false;
          const abtn = document.querySelector('.btn-admin');
          if (abtn) abtn.style.display = isAdmin ? '' : 'none';
        }
      } catch (e) { console.warn('Erro ao verificar admin:', e); }

      closeModal(); showToast('Entrou com sucesso', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao autenticar', 'error');
    }
    return;
  }
  showToast('Autenticação desativada: configure Supabase (veja README).', 'error');
}

async function register() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  if (!name || !email || !pass) { showToast('Preencha todos os campos', 'error'); return; }
  if (pass !== confirm) { showToast('As senhas não coincidem', 'error'); return; }
  if (pass.length < 6) { showToast('Senha deve ter pelo menos 6 caracteres', 'error'); return; }

  if (typeof window.supabaseClient !== 'undefined') {
    const sup = window.supabaseClient;
    try {
      const { data: signData, error: signErr } = await sup.auth.signUp({ email, password: pass, options: { data: { name } } });
      if (signErr) {
        if (signErr.status === 422) showToast('Email já existe ou senha inválida', 'error');
        else showToast(signErr.message || 'Erro ao registrar', 'error');
        return;
      }
      // try upserting profile in users table
      try {
        const user = signData?.user;
        if (user) {
          const profile = { id: user.id, name, email: user.email, created: new Date().toISOString() };
          const { error: upErr } = await sup.from('users').upsert(profile);
          if (upErr) console.warn('upsert profile', upErr);
        }
      } catch (e) { console.warn('Erro ao salvar perfil Supabase:', e); }
      closeModal();
      showVerificationModal(email);
    } catch (err) {
      showToast(err.message || 'Erro ao registrar', 'error');
    }
    return;
  }
  showToast('Autenticação desativada: configure Supabase (veja README).', 'error');
}

function updateUserUI() {
  const btn = document.querySelector('.btn-register');
  if (!btn) return;
  if (currentUser) {
    const first = (currentUser.name || currentUser.email || 'Usuário').split(' ')[0];
    if (currentUser.emailVerified === false) {
      btn.innerHTML = `${first} <span class="badge-awaiting">AGUARDANDO</span>`;
    } else {
      btn.textContent = first;
    }
    btn.onclick = async () => {
      try {
        if (typeof window.supabaseClient !== 'undefined') await window.supabaseClient.auth.signOut();
      } catch (e) { console.warn('Erro ao deslogar', e); }
      DB.set('session', null);
      currentUser = null;
      btn.textContent = 'Entrar';
      btn.onclick = () => showModal('login');
      showToast('Sessão encerrada', 'success');
    };
  } else {
    btn.textContent = 'Entrar';
    btn.onclick = () => showModal('login');
  }
}

// ===================== VERIFICATION MODAL =====================
function showVerificationModal(email) {
  const modal = document.getElementById('modal-verify');
  if (!modal) return;
  document.getElementById('verify-title').textContent = 'Verifique seu e-mail';
  document.getElementById('verify-desc').textContent = `Enviamos um e-mail para ${email}. Abra-o e clique no link para ativar sua conta.`;
  document.getElementById('verify-log').textContent = '';
  modal.style.display = 'block';
  document.getElementById('verify-resend').onclick = async () => {
    document.getElementById('verify-log').textContent = 'Tentando reenviar...';
    try {
      if (typeof window.supabaseClient !== 'undefined') {
        // cliente não tem endpoint direto para reenvio de confirmação; encaminhar para Magic Link como alternativa
        const { error } = await window.supabaseClient.auth.signInWithOtp({ email });
        if (error) throw error;
        document.getElementById('verify-log').textContent = 'Um link de acesso foi enviado como alternativa. Verifique sua caixa de entrada.';
        return;
      }
      document.getElementById('verify-log').textContent = 'Reenvio indisponível. Configure Supabase.';
    } catch (e) {
      console.error(e);
      document.getElementById('verify-log').textContent = 'Erro ao reenviar: ' + (e.message || e);
    }
  };
  document.getElementById('verify-checked').onclick = async () => {
    try {
      if (typeof window.supabaseClient !== 'undefined') {
        const { data, error } = await window.supabaseClient.auth.getUser();
        if (error) throw error;
        const user = data && data.user ? data.user : null;
        if (!user) { document.getElementById('verify-log').textContent = 'Nenhum usuário autenticado.'; return; }
        if (user.email_confirmed_at) {
          // load profile
          const { data: profileData } = await window.supabaseClient.from('users').select('*').eq('id', user.id).maybeSingle();
          const profile = profileData || { id: user.id, email: user.email, name: user.user_metadata?.name };
          profile.emailVerified = true;
          DB.set('session', profile);
          currentUser = profile;
          hideVerificationModal();
          updateUserUI();
          showToast('E-mail verificado! Bem-vindo.', 'success');
        } else {
          document.getElementById('verify-log').textContent = 'E-mail ainda não verificado. Verifique sua caixa de entrada.';
        }
        return;
      }
      // sem fallback Firebase — verificação disponível apenas via Supabase
      document.getElementById('verify-log').textContent = 'Recurso de verificação disponível apenas com Supabase.';
    } catch (e) { console.error(e); document.getElementById('verify-log').textContent = 'Erro ao checar verificação.'; }
  };
  document.getElementById('verify-close').onclick = () => hideVerificationModal();
}

function hideVerificationModal() {
  const modal = document.getElementById('modal-verify');
  if (modal) modal.style.display = 'none';
}

function goAdmin() {
  window.open('painel-gs7x2.html', '_blank');
}

// ===================== UTILS =====================
function addToList(id) {
  let list = DB.get('mylist') || [];
  if (list.includes(id)) { showToast('Já está na sua lista'); return; }
  list.push(id);
  DB.set('mylist', list);
  showToast('Adicionado à sua lista!', 'success');
}

function shareContent() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link copiado!', 'success');
  }
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function normalizeStr(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function canonLabel(genero) {
  if (!genero) return '';
  const req = normalizeStr(genero);
  if (typeof GENEROS !== 'undefined' && Array.isArray(GENEROS)) {
    const found = GENEROS.find(x => normalizeStr(x) === req) || GENEROS.find(x => normalizeStr(x).includes(req));
    if (found) return found;
  }
  const words = String(genero).split(/\s+/).map(w => capitalize(w));
  return words.join(' ');
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toggleMobileMenu() {
  document.getElementById('nav').classList.toggle('mobile-open');
}

// ===================== SCROLL TO TOP =====================
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
});

// ===================== HEADER SCROLL EFFECT =====================
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (header) {
    if (window.scrollY > 60) {
      header.style.background = 'rgba(10,10,10,0.98)';
      header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.5)';
    } else {
      header.style.background = '';
      header.style.boxShadow = '';
    }
  }
});

// ===================== KEYBOARD SEARCH =====================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    const nav = document.getElementById('nav');
    if (nav) nav.classList.remove('mobile-open');
  }
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    const si = document.getElementById('search-input');
    if (si) si.focus();
  }
});

// ===================== CLOSE DROPDOWNS ON OUTSIDE CLICK =====================
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav-dropdown')) {
    document.querySelectorAll('.dropdown-menu').forEach(m => { /* CSS hover handles this */ });
  }
  if (!e.target.closest('.nav') && !e.target.closest('.mobile-menu-btn')) {
    const nav = document.getElementById('nav');
    if (nav) nav.classList.remove('mobile-open');
  }
});

// ===================== SEARCH ON ENTER =====================
document.addEventListener('DOMContentLoaded', () => {
  const si = document.getElementById('search-input');
  if (si) {
    si.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchContent(si.value);
    });
  }
});
