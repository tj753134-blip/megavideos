// ===================== ADMIN STATE =====================
let adminLoggedIn = false;
let editingContent = null;
let editingType = '';

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  // Usar Supabase Auth para administrar acesso ao painel
  if (typeof window.supabaseClient !== 'undefined') {
    const sup = window.supabaseClient;
    sup.auth.onAuthStateChange(async (event, session) => {
      const user = session && session.user ? session.user : null;
      if (user) {
        try {
          // verify admin entitlement in admins table
          const { data, error } = await sup.from('admins').select('*').eq('id', user.id).maybeSingle();
          if (error) throw error;
          if (data) showAdminPanel();
          else {
            showAdminToast('Acesso negado: conta sem privilégio de administrador', 'error');
            await sup.auth.signOut();
            document.getElementById('admin-login-screen').style.display = 'flex';
          }
        } catch (e) {
          console.error('Erro verificando admins (Supabase):', e);
          showAdminToast('Erro ao verificar permissões. Contate o administrador.', 'error');
          try { await sup.auth.signOut(); } catch(e) { }
          document.getElementById('admin-login-screen').style.display = 'flex';
        }
      } else document.getElementById('admin-login-screen').style.display = 'flex';
    });
  } else {
    const el = document.getElementById('admin-login-screen');
    if (el) {
      el.innerHTML = '<div style="padding:24px;color:#fff;background:#2b2b2b;border-radius:8px;max-width:720px;margin:40px auto;text-align:center">Painel administrador requer Supabase configurado. Veja o README.md.</div>';
      el.style.display = 'flex';
    }
    return;
  }

  loadAdminData();
  updateBadges();
});

// ===================== AUTH =====================
async function adminLogin() {
  const email = document.getElementById('admin-user-input').value.trim();
  const password = document.getElementById('admin-pass-input').value;
  const errorDiv = document.getElementById('admin-login-error');
  const btn = document.querySelector('.admin-login-box button');

  if (errorDiv) errorDiv.textContent = '';
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A entrar...';
    btn.disabled = true;
  }

  try {
    const sup = window.supabaseClient;
    const { data, error } = await sup.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const userId = data?.user?.id;

    const { data: adm, error: admErr } = await sup.from('admins').select('role').eq('id', userId).single();
    if (admErr || !adm) {
      await sup.auth.signOut();
      throw new Error('Acesso negado. Não és administrador.');
    }

    sessionStorage.setItem('adminAuth','true');
    showAdminPanel();
  } catch(e) {
    if (errorDiv) errorDiv.textContent = e.message || 'Erro ao fazer login.';
  } finally {
    if (btn) { btn.innerHTML = '<i class="fas fa-lock"></i> Entrar no Painel'; btn.disabled = false; }
  }
}

function showAdminPanel() {
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'flex';
  adminLoggedIn = true;
  loadDashboard();
}

async function adminLogout() {
  if (typeof window.supabaseClient !== 'undefined') {
    try { await window.supabaseClient.auth.signOut(); } catch(e) { console.warn(e); }
  }
  sessionStorage.removeItem('adminAuth');
  location.reload();
}

function toggleSidebar() {
  document.getElementById('admin-sidebar').classList.toggle('collapsed');
  document.getElementById('admin-sidebar').classList.toggle('open');
}

// ===================== PAGES =====================
function adminPage(name) {
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-' + name).classList.add('active');
  const titles = { dashboard: 'Dashboard', filmes: 'Filmes', series: 'Séries', episodios: 'Episódios', pedidos: 'Pedidos', hero: 'Banner Hero', usuarios: 'Usuários', config: 'Configurações' };
  document.getElementById('admin-title').textContent = titles[name] || name;

  if (name === 'dashboard') loadDashboard();
  else if (name === 'filmes') loadFilmesTable();
  else if (name === 'series') loadSeriesTable();
  else if (name === 'episodios') loadEpisodesPage();
  else if (name === 'pedidos') loadPedidosAdmin();
  else if (name === 'hero') loadHeroAdmin();
  else if (name === 'usuarios') loadUsuariosAdmin();
  else if (name === 'config') loadConfig();
}

// ===================== DASHBOARD =====================
function loadDashboard() {
  const filmes = DB.get('filmes') || [];
  const series = DB.get('series') || [];
  const pedidos = DB.get('pedidos') || [];
  const users = DB.get('users') || [];
  const totalEps = series.reduce((acc, s) => acc + (s.temporadas || []).reduce((a, t) => a + (t.episodios || []).length, 0), 0);

  document.getElementById('stat-filmes').textContent = filmes.length;
  document.getElementById('stat-series').textContent = series.length;
  document.getElementById('stat-episodios').textContent = totalEps;
  document.getElementById('stat-pedidos').textContent = pedidos.length;
  document.getElementById('stat-usuarios').textContent = users.length;

  const all = [...filmes.slice(-3).reverse(), ...series.slice(-3).reverse()].slice(0, 6);
  document.getElementById('recent-content').innerHTML = all.map(c => `
    <div class="recent-item">
      <div class="recent-thumb"><i class="fas fa-${c.tipo === 'serie' ? 'tv' : 'film'}"></i></div>
      <div class="recent-item-info">
        <h4>${c.titulo}</h4>
        <p>${c.ano} • ${c.duracao}</p>
      </div>
      <span class="type-badge type-${c.tipo}">${c.tipo === 'serie' ? 'Série' : 'Filme'}</span>
    </div>
  `).join('') || '<p style="color:#666;font-size:13px">Nenhum conteúdo ainda.</p>';

  const recentPedidos = pedidos.slice(0, 5);
  document.getElementById('recent-pedidos-admin').innerHTML = recentPedidos.map(p => `
    <div class="recent-item">
      <div class="recent-item-info" style="flex:1">
        <h4>${escHtml(p.titulo)}</h4>
        <p>${p.data}</p>
      </div>
    </div>
  `).join('') || '<p style="color:#666;font-size:13px">Nenhum pedido.</p>';
}

function loadAdminData() {}

function updateBadges() {
  const pedidos = DB.get('pedidos') || [];
  const badge = document.getElementById('pedidos-badge');
  if (badge) { badge.textContent = pedidos.length; badge.style.display = pedidos.length ? 'inline' : 'none'; }
}

// ===================== FILMES TABLE =====================
function loadFilmesTable(filter = '') {
  let filmes = DB.get('filmes') || [];
  if (filter) filmes = filmes.filter(f => f.titulo.toLowerCase().includes(filter.toLowerCase()));
  document.getElementById('filmes-tbody').innerHTML = filmes.map(f => `
    <tr>
      <td>${f.poster ? `<img src="${f.poster}" alt="">` : `<div class="thumb-placeholder"><i class="fas fa-film"></i></div>`}</td>
      <td><strong style="color:#ddd">${f.titulo}</strong></td>
      <td>${f.ano}</td>
      <td>${(f.generos || []).join(', ')}</td>
      <td><span style="background:rgba(26,140,255,0.12);color:#1a8cff;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700">${f.audio || 'DUB'}</span></td>
      <td>⭐ ${f.rating}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="openContentModal('filme', ${f.id})"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn-delete" onclick="deleteContent(${f.id}, 'filme')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;color:#666;padding:30px">Nenhum filme cadastrado.</td></tr>`;
}

// ===================== SÉRIES TABLE =====================
function loadSeriesTable(filter = '') {
  let series = DB.get('series') || [];
  if (filter) series = series.filter(s => s.titulo.toLowerCase().includes(filter.toLowerCase()));
  document.getElementById('series-tbody').innerHTML = series.map(s => `
    <tr>
      <td>${s.poster ? `<img src="${s.poster}" alt="">` : `<div class="thumb-placeholder"><i class="fas fa-tv"></i></div>`}</td>
      <td><strong style="color:#ddd">${s.titulo}</strong></td>
      <td>${s.ano}</td>
      <td>${(s.temporadas || []).length} temporada(s)</td>
      <td>${(s.generos || []).join(', ')}</td>
      <td>⭐ ${s.rating}</td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="openContentModal('serie', ${s.id})"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn-eps" onclick="goToEpisodes(${s.id})"><i class="fas fa-list"></i> Eps</button>
          <button class="btn-delete" onclick="deleteContent(${s.id}, 'serie')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center;color:#666;padding:30px">Nenhuma série cadastrada.</td></tr>`;
}

function searchAdminContent(type) {
  const val = document.getElementById('search-' + type).value;
  if (type === 'filmes') loadFilmesTable(val);
  else loadSeriesTable(val);
}

// ===================== CONTENT MODAL =====================
function openContentModal(type, id = null) {
  editingType = type;
  editingContent = null;
  const isSerie = type === 'serie';
  let data = { titulo: '', titulo_orig: '', ano: new Date().getFullYear(), duracao: '', rating: '7.0', descricao: '', generos: [], audio: 'DUB', qualidade: 'HD', diretor: '', elenco: '', produtor: '', poster: '', backdrop: '', url_video: '', tipo: type };

  if (id) {
    const arr = DB.get(isSerie ? 'series' : 'filmes') || [];
    const found = arr.find(c => c.id === id);
    if (found) { data = { ...found }; editingContent = found; }
  }

  document.getElementById('admin-modal-title').textContent = `${id ? 'Editar' : 'Adicionar'} ${isSerie ? 'Série' : 'Filme'}`;

  const genreCheckboxes = GENEROS.map(g => `
    <div class="genre-check ${(data.generos || []).includes(g) ? 'selected' : ''}" onclick="toggleGenre(this, '${g}')" data-genre="${g}">${g}</div>
  `).join('');

  document.getElementById('admin-modal-body').innerHTML = `
    <div class="form-grid-2">
      <div class="form-group">
        <label>Título (PT)</label>
        <input type="text" id="f-titulo" value="${escHtml(data.titulo)}" placeholder="Título em português">
      </div>
      <div class="form-group">
        <label>Título Original</label>
        <input type="text" id="f-titulo-orig" value="${escHtml(data.titulo_orig || '')}" placeholder="Título original">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group">
        <label>Ano</label>
        <input type="number" id="f-ano" value="${data.ano}" min="1900" max="2099">
      </div>
      <div class="form-group">
        <label>Duração</label>
        <input type="text" id="f-duracao" value="${escHtml(data.duracao)}" placeholder="ex: 105min">
      </div>
    </div>
    <div class="form-grid-2">
      <div class="form-group">
        <label>Avaliação (0-10)</label>
        <input type="text" id="f-rating" value="${data.rating}" placeholder="ex: 8.2">
      </div>
      <div class="form-group">
        <label>Qualidade</label>
        <select id="f-qualidade">
          <option ${data.qualidade === 'HD' ? 'selected' : ''}>HD</option>
          <option ${data.qualidade === 'FHD' ? 'selected' : ''}>FHD</option>
          <option ${data.qualidade === '4K' ? 'selected' : ''}>4K</option>
          <option ${data.qualidade === 'SD' ? 'selected' : ''}>SD</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Áudio</label>
      <select id="f-audio">
        <option ${data.audio === 'DUB' ? 'selected' : ''}>DUB</option>
        <option ${data.audio === 'LEG' ? 'selected' : ''}>LEG</option>
        <option ${data.audio === 'DUB/LEG' ? 'selected' : ''}>DUB/LEG</option>
      </select>
    </div>
    <div class="form-group">
      <label>Descrição / Sinopse</label>
      <textarea id="f-descricao" rows="3" placeholder="Sinopse do conteúdo...">${escHtml(data.descricao || '')}</textarea>
    </div>
    <div class="form-grid-2">
      <div class="form-group">
        <label>Diretor</label>
        <input type="text" id="f-diretor" value="${escHtml(data.diretor || '')}" placeholder="Nome do diretor">
      </div>
      <div class="form-group">
        <label>Produtor</label>
        <input type="text" id="f-produtor" value="${escHtml(data.produtor || '')}" placeholder="Studio/Produtora">
      </div>
    </div>
    <div class="form-group">
      <label>Elenco</label>
      <input type="text" id="f-elenco" value="${escHtml(data.elenco || '')}" placeholder="Atores (separados por vírgula)">
    </div>
    <div class="form-group">
      <label>URL da Capa (Poster)</label>
      <input type="text" id="f-poster" value="${escHtml(data.poster || '')}" placeholder="https://...">
    </div>
    <div class="form-group">
      <label>URL do Backdrop (Imagem de fundo)</label>
      <input type="text" id="f-backdrop" value="${escHtml(data.backdrop || '')}" placeholder="https://...">
    </div>
    ${!isSerie ? `
    <div class="form-group">
      <label>URL do Vídeo</label>
      <input type="text" id="f-video" value="${escHtml(data.url_video || '')}" placeholder="YouTube, Google Drive, ou link direto (.mp4)">
    </div>
    <div class="form-group">
      <label>URL do Vídeo (Servidor Alternativo)</label>
      <input type="text" id="f-video2" value="${escHtml((function(){try{const s=data.servers;if(!s)return '';const arr=Array.isArray(s)?s:(typeof s==='string'?JSON.parse(s):[]);return Array.isArray(arr)&&arr[1]?arr[1]:''}catch(e){return ''}})())}" placeholder="URL secundária (opcional)">
    </div>
    ` : ''}
    <div class="form-group">
      <label>Gêneros</label>
      <div class="genre-checkboxes" id="genre-boxes">${genreCheckboxes}</div>
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeAdminModal()">Cancelar</button>
      <button class="btn-save" onclick="saveContent()"><i class="fas fa-save"></i> Salvar</button>
    </div>
  `;

  showAdminModal();
}

function toggleGenre(el, genre) {
  el.classList.toggle('selected');
}

function saveContent() {
  const isSerie = editingType === 'serie';
  const titulo = document.getElementById('f-titulo').value.trim();
  if (!titulo) { showAdminToast('Digite o título', 'error'); return; }

  const selectedGenres = Array.from(document.querySelectorAll('.genre-check.selected')).map(el => el.dataset.genre);

  const content = {
    id: editingContent ? editingContent.id : Date.now(),
    tipo: editingType,
    titulo,
    titulo_orig: document.getElementById('f-titulo-orig').value.trim(),
    ano: parseInt(document.getElementById('f-ano').value) || new Date().getFullYear(),
    duracao: document.getElementById('f-duracao').value.trim(),
    rating: document.getElementById('f-rating').value.trim(),
    qualidade: document.getElementById('f-qualidade').value,
    audio: document.getElementById('f-audio').value,
    descricao: document.getElementById('f-descricao').value.trim(),
    diretor: document.getElementById('f-diretor').value.trim(),
    produtor: document.getElementById('f-produtor').value.trim(),
    elenco: document.getElementById('f-elenco').value.trim(),
    poster: document.getElementById('f-poster').value.trim(),
    backdrop: document.getElementById('f-backdrop').value.trim(),
    generos: selectedGenres,
  };

  if (!isSerie) {
    const url1 = document.getElementById('f-video').value.trim();
    const url2El = document.getElementById('f-video2');
    const url2 = url2El ? url2El.value.trim() : '';
    const servers = [url1, url2].filter(Boolean);
    // guarda url_video como string principal e servers como JSON
    content.url_video = url1;
    content.servers = servers.length > 1 ? JSON.stringify(servers) : null;
  }

  const key = isSerie ? 'series' : 'filmes';
  (async () => {
    try {
      if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase não configurado');
      const sup = window.supabaseClient;
      const payload = { ...content };
      if (!editingContent) delete payload.id; // let DB generate id on insert
      // tentar upsert incluindo 'servers' se presente; se o banco não tiver essa coluna, tentar novamente sem ela
      let { data, error } = await sup.from(key).upsert(payload).select();
      if (error) {
        const msg = (error.message || '').toLowerCase();
        const isServersColErr = msg.includes("could not find the 'servers'") || msg.includes('servers') && msg.includes('column');
        if (isServersColErr) {
          try {
            delete payload.servers;
            const retry = await sup.from(key).upsert(payload).select();
            data = retry.data; if (retry.error) throw retry.error;
          } catch (reErr) { throw reErr; }
        } else {
          throw error;
        }
      }
      // recarregar cache local
      await DB.init();
      closeAdminModal();
      showAdminToast(`${isSerie ? 'Série' : 'Filme'} ${editingContent ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
      if (isSerie) loadSeriesTable(); else loadFilmesTable();
      loadDashboard();
    } catch (e) {
      console.error('saveContent error', e);
      showAdminToast('Erro ao salvar conteúdo: ' + (e.message || e), 'error');
    }
  })();
}

function deleteContent(id, type) {
  if (!confirm('Tem certeza que deseja remover este conteúdo?')) return;
  (async () => {
    try {
      if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase não configurado');
      const sup = window.supabaseClient;
      const key = type === 'serie' ? 'series' : 'filmes';
      const { error } = await sup.from(key).delete().eq('id', id);
      if (error) throw error;
      await DB.init();
      showAdminToast('Conteúdo removido!', 'success');
      if (type === 'serie') loadSeriesTable(); else loadFilmesTable();
      loadDashboard();
    } catch (e) {
      console.error('deleteContent error', e);
      showAdminToast('Erro ao remover conteúdo: ' + (e.message || e), 'error');
    }
  })();
}

// ===================== EPISODES =====================
function loadEpisodesPage() {
  const series = DB.get('series') || [];
  const sel = document.getElementById('ep-serie-select');
  sel.innerHTML = `<option value="">-- Selecione uma Série --</option>` +
    series.map(s => `<option value="${s.id}">${s.titulo}</option>`).join('');
  document.getElementById('episodios-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#666;padding:30px">Selecione uma série para ver os episódios.</td></tr>`;
}

function goToEpisodes(serieId) {
  adminPage('episodios');
  setTimeout(() => {
    document.getElementById('ep-serie-select').value = serieId;
    loadEpisodesAdmin();
  }, 50);
}

function loadEpisodesAdmin() {
  const serieId = parseInt(document.getElementById('ep-serie-select').value);
  const series = DB.get('series') || [];
  const serie = series.find(s => s.id === serieId);
  const tSel = document.getElementById('ep-temporada-select');

  if (!serie) {
    tSel.innerHTML = '<option value="">-- Temporada --</option>';
    document.getElementById('episodios-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#666;padding:30px">Selecione uma série.</td></tr>`;
    return;
  }

  tSel.innerHTML = `<option value="">-- Temporada --</option>` +
    (serie.temporadas || []).map((t, i) => `<option value="${i}">${t.titulo}</option>`).join('');

  const tIdx = document.getElementById('ep-temporada-select').value;
  if (tIdx === '') {
    document.getElementById('episodios-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;color:#666;padding:30px">Selecione uma temporada.</td></tr>`;
    return;
  }

  renderEpisodesTable(serie, parseInt(tIdx));
}

function renderEpisodesTable(serie, tIdx) {
  const season = (serie.temporadas || [])[tIdx];
  if (!season) return;
  const eps = season.episodios || [];
  document.getElementById('episodios-tbody').innerHTML = eps.map((ep, i) => `
    <tr>
      <td style="color:#888">${ep.num || i+1}</td>
      <td><strong style="color:#ddd">${escHtml(ep.titulo)}</strong></td>
      <td>${ep.duracao}</td>
      <td><span style="color:#666;font-size:12px">${(ep.servers && ep.servers.length) ? ep.servers.map((u,idx) => `<a href="${u}" target="_blank" style="color:#1a8cff">Srv ${idx+1}</a>`).join(' | ') : (ep.url ? `<a href="${ep.url}" target="_blank" style="color:#1a8cff">Link</a>` : 'Sem URL')}</span></td>
      <td>
        <div class="table-actions">
          <button class="btn-edit" onclick="openEpisodeModal(${serie.id}, ${tIdx}, ${i})"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn-delete" onclick="deleteEpisode(${serie.id}, ${tIdx}, ${i})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:#666;padding:30px">Nenhum episódio nesta temporada.</td></tr>`;
}

function openEpisodeModal(serieId, tIdx, epIdx) {
  const series = DB.get('series') || [];
  const sid = serieId || parseInt(document.getElementById('ep-serie-select').value);
  const tidx = tIdx !== undefined ? tIdx : parseInt(document.getElementById('ep-temporada-select').value);
  const serie = series.find(s => s.id === sid);
  if (!serie) { showAdminToast('Selecione uma série primeiro', 'error'); return; }

  const season = (serie.temporadas || [])[tidx];
  const ep = (epIdx !== undefined && season) ? season.episodios[epIdx] : null;

  document.getElementById('admin-modal-title').textContent = ep ? 'Editar Episódio' : 'Adicionar Episódio';
  document.getElementById('admin-modal-body').innerHTML = `
    <input type="hidden" id="ep-serie-id" value="${sid}">
    <input type="hidden" id="ep-t-idx" value="${tidx}">
    <input type="hidden" id="ep-idx" value="${epIdx !== undefined ? epIdx : -1}">
    <div class="form-group">
      <label>Número do Episódio</label>
      <input type="number" id="ep-num" value="${ep ? ep.num : (season ? season.episodios.length + 1 : 1)}" min="1">
    </div>
    <div class="form-group">
      <label>Título</label>
      <input type="text" id="ep-titulo" value="${ep ? escHtml(ep.titulo) : ''}" placeholder="ex: Episódio 01 - Nome">
    </div>
    <div class="form-group">
      <label>Duração</label>
      <input type="text" id="ep-duracao" value="${ep ? ep.duracao : ''}" placeholder="ex: 24min">
    </div>
    <div class="form-group">
      <label>Servidores Alternativos</label>
      <div id="ep-servers-list">
        ${(ep && Array.isArray(ep.servers) ? ep.servers : (ep && ep.url ? [ep.url] : [])).map((s, i) => `
          <div class="server-row" data-idx="${i}">
            <input type="text" class="ep-server-input" value="${escHtml(s)}" placeholder="https://... ou <iframe>...">
            <button class="btn-delete" onclick="removeServer(this)"><i class="fas fa-trash"></i></button>
          </div>
        `).join('')}
      </div>
      <button onclick="addServerInput()" class="btn-add" style="margin-top:8px"><i class="fas fa-plus"></i> Adicionar Servidor</button>
      <small style="color:#888;display:block;margin-top:6px">Cole URLs ou um iframe por servidor.</small>
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeAdminModal()">Cancelar</button>
      <button class="btn-save" onclick="saveEpisode()"><i class="fas fa-save"></i> Salvar</button>
    </div>
  `;
  showAdminModal();
}

function addServerInput(value) {
  const list = document.getElementById('ep-servers-list');
  const idx = list.children.length;
  const div = document.createElement('div');
  div.className = 'server-row';
  div.dataset.idx = idx;
  div.innerHTML = `<input type="text" class="ep-server-input" value="${escHtml(value||'')}" placeholder="https://... ou <iframe>..."> <button class="btn-delete" onclick="removeServer(this)"><i class="fas fa-trash"></i></button>`;
  list.appendChild(div);
}

function removeServer(btn) {
  const row = btn.closest('.server-row');
  if (row) row.remove();
}

function saveEpisode() {
  (async () => {
    try {
      const sid = parseInt(document.getElementById('ep-serie-id').value);
      const tIdx = parseInt(document.getElementById('ep-t-idx').value);
      const epIdx = parseInt(document.getElementById('ep-idx').value);
      const titulo = document.getElementById('ep-titulo').value.trim();
      if (!titulo) { showAdminToast('Digite o título do episódio', 'error'); return; }

      const num = parseInt(document.getElementById('ep-num').value) || 1;
      const duracao = document.getElementById('ep-duracao').value.trim() || '24min';
      const inputs = Array.from(document.querySelectorAll('.ep-server-input')).map(i => i.value.trim()).filter(Boolean);

      const series = DB.get('series') || [];
      const sIdx = series.findIndex(s => s.id === sid);
      if (sIdx === -1) { showAdminToast('Série não encontrada', 'error'); return; }
      if (!series[sIdx].temporadas[tIdx]) { showAdminToast('Temporada não encontrada', 'error'); return; }

      const ep = { num, titulo, duracao };
      if (inputs.length === 1) { ep.url = inputs[0]; ep.servers = [inputs[0]]; }
      else if (inputs.length > 1) ep.servers = inputs;
      else ep.servers = [];

      if (epIdx === -1) series[sIdx].temporadas[tIdx].episodios.push(ep);
      else series[sIdx].temporadas[tIdx].episodios[epIdx] = ep;

      // Persistir no Supabase
      if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase não configurado');
      const sup = window.supabaseClient;
      const serie = series[sIdx];
      const { data, error } = await sup.from('series').upsert(serie, { onConflict: 'id' }).select();
      if (error) throw error;
      await DB.init();
      closeAdminModal();
      showAdminToast('Episódio salvo!', 'success');
      renderEpisodesTable(serie, tIdx);
      loadDashboard();
    } catch (err) {
      console.error('Erro salvando episódio:', err);
      showAdminToast('Erro ao salvar episódio: ' + (err.message || err), 'error');
    }
  })();
}

function deleteEpisode(serieId, tIdx, epIdx) {
  (async () => {
    try {
      if (!confirm('Remover este episódio?')) return;
      const series = DB.get('series') || [];
      const sIdx = series.findIndex(s => s.id === serieId);
      if (sIdx === -1) return;
      series[sIdx].temporadas[tIdx].episodios.splice(epIdx, 1);
      if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase não configurado');
      const sup = window.supabaseClient;
      const { error } = await sup.from('series').upsert(series[sIdx], { onConflict: 'id' });
      if (error) throw error;
      await DB.init();
      showAdminToast('Episódio removido!', 'success');
      renderEpisodesTable(series[sIdx], tIdx);
      loadDashboard();
    } catch (err) {
      console.error('Erro removendo episódio:', err);
      showAdminToast('Erro ao remover episódio: ' + (err.message || err), 'error');
    }
  })();
}

// ===================== SEASONS =====================
function openSeasonModal() {
  const sid = parseInt(document.getElementById('ep-serie-select').value);
  const series = DB.get('series') || [];
  const serie = series.find(s => s.id === sid);
  if (!serie) { showAdminToast('Selecione uma série primeiro', 'error'); return; }

  document.getElementById('admin-modal-title').textContent = `Temporadas — ${serie.titulo}`;
  document.getElementById('admin-modal-body').innerHTML = `
    <input type="hidden" id="season-serie-id" value="${sid}">
    <div class="seasons-manager" id="seasons-manager">
      ${(serie.temporadas || []).map((t, i) => `
        <div class="season-item" id="season-item-${i}">
          <span>${t.titulo} (${t.episodios.length} eps)</span>
          <div style="display:flex;gap:6px">
            <button class="btn-edit" onclick="editSeasonTitle(${i})">Renomear</button>
            <button class="btn-delete" onclick="deleteSeason(${i})">Remover</button>
          </div>
        </div>
      `).join('') || '<p style="color:#666;font-size:13px;margin-bottom:12px">Nenhuma temporada cadastrada.</p>'}
    </div>
    <div class="add-season-row">
      <input type="text" id="new-season-name" placeholder="ex: Temporada 2">
      <button onclick="addSeason()"><i class="fas fa-plus"></i> Adicionar</button>
    </div>
    <div class="modal-footer" style="margin-top:16px">
      <button class="btn-cancel" onclick="closeAdminModal()">Fechar</button>
    </div>
  `;
  showAdminModal();
}

function addSeason() {
  const sid = parseInt(document.getElementById('season-serie-id').value);
  const name = document.getElementById('new-season-name').value.trim();
  if (!name) { showAdminToast('Digite o nome da temporada', 'error'); return; }
  const series = DB.get('series') || [];
  const sIdx = series.findIndex(s => s.id === sid);
  if (sIdx === -1) return;
  series[sIdx].temporadas.push({ num: series[sIdx].temporadas.length + 1, titulo: name, episodios: [] });
  DB.set('series', series);
  showAdminToast('Temporada adicionada!', 'success');
  openSeasonModal();
  loadEpisodesAdmin();
}

function deleteSeason(tIdx) {
  const sid = parseInt(document.getElementById('season-serie-id').value);
  if (!confirm('Remover esta temporada e todos os seus episódios?')) return;
  const series = DB.get('series') || [];
  const sIdx = series.findIndex(s => s.id === sid);
  if (sIdx === -1) return;
  series[sIdx].temporadas.splice(tIdx, 1);
  DB.set('series', series);
  showAdminToast('Temporada removida!', 'success');
  openSeasonModal();
  loadEpisodesAdmin();
}

function editSeasonTitle(tIdx) {
  const sid = parseInt(document.getElementById('season-serie-id').value);
  const series = DB.get('series') || [];
  const sIdx = series.findIndex(s => s.id === sid);
  const newTitle = prompt('Novo nome da temporada:', series[sIdx].temporadas[tIdx].titulo);
  if (!newTitle) return;
  series[sIdx].temporadas[tIdx].titulo = newTitle;
  DB.set('series', series);
  showAdminToast('Temporada renomeada!', 'success');
  openSeasonModal();
  loadEpisodesAdmin();
}

// ===================== PEDIDOS =====================
function loadPedidosAdmin() {
  const pedidos = DB.get('pedidos') || [];
  document.getElementById('pedidos-tbody').innerHTML = pedidos.map((p, i) => `
    <tr>
      <td><strong style="color:#ddd">${escHtml(p.titulo)}</strong></td>
      <td>${p.ano || '-'}</td>
      <td>${p.obs ? escHtml(p.obs.slice(0,60)) + (p.obs.length > 60 ? '...' : '') : '-'}</td>
      <td>${p.data}</td>
      <td>
        <div class="table-actions">
          <button class="btn-approve" onclick="approvePedido(${i})"><i class="fas fa-check"></i> OK</button>
          <button class="btn-delete" onclick="deletePedido(${i})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('') || `<tr><td colspan="5" style="text-align:center;color:#666;padding:30px">Nenhum pedido.</td></tr>`;
  updateBadges();
}

function approvePedido(idx) {
  const pedidos = DB.get('pedidos') || [];
  showAdminToast(`Pedido "${pedidos[idx]?.titulo}" aprovado!`, 'success');
}

function deletePedido(idx) {
  if (!confirm('Remover este pedido?')) return;
  const pedidos = DB.get('pedidos') || [];
  pedidos.splice(idx, 1);
  DB.set('pedidos', pedidos);
  showAdminToast('Pedido removido!', 'success');
  loadPedidosAdmin();
}

// ===================== HERO ADMIN =====================
function loadHeroAdmin() {
  const hero = DB.get('hero') || [];
  document.getElementById('hero-admin-grid').innerHTML = hero.map((h, i) => `
    <div class="hero-admin-card">
      ${h.backdrop ? `<img src="${h.backdrop}" alt="">` : `<div class="hero-card-img-placeholder"><i class="fas fa-image"></i></div>`}
      <div class="hero-card-info">
        <h4>${escHtml(h.titulo)}</h4>
        <div class="hero-card-actions">
          <button class="btn-edit" onclick="openHeroModal(${i})"><i class="fas fa-edit"></i> Editar</button>
          <button class="btn-delete" onclick="deleteHero(${i})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>
  `).join('') || `<p style="color:#666">Nenhum banner configurado.</p>`;
}

function openHeroModal(editIdx) {
  const hero = DB.get('hero') || [];
  const h = editIdx !== undefined ? hero[editIdx] : null;
  const filmes = DB.get('filmes') || [];
  const series = DB.get('series') || [];
  const allContent = [...filmes, ...series];

  document.getElementById('admin-modal-title').textContent = h ? 'Editar Banner Hero' : 'Adicionar Banner Hero';
  document.getElementById('admin-modal-body').innerHTML = `
    <input type="hidden" id="hero-edit-idx" value="${editIdx !== undefined ? editIdx : -1}">
    <div class="form-group">
      <label>Título do Banner</label>
      <input type="text" id="hero-titulo" value="${h ? escHtml(h.titulo) : ''}" placeholder="Título exibido no hero">
    </div>
    <div class="form-group">
      <label>Subtítulo</label>
      <input type="text" id="hero-subtitulo" value="${h ? escHtml(h.subtitulo || '') : ''}" placeholder="ex: Netflix Original">
    </div>
    <div class="form-group">
      <label>Conteúdo Vinculado</label>
      <select id="hero-content-id">
        <option value="">-- Selecione --</option>
        ${allContent.map(c => `<option value="${c.id}|${c.tipo}" ${h && h.content_id === c.id ? 'selected' : ''}>${c.titulo} (${c.tipo === 'serie' ? 'Série' : 'Filme'})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>URL do Backdrop (imagem de fundo do hero)</label>
      <input type="text" id="hero-backdrop" value="${h ? escHtml(h.backdrop || '') : ''}" placeholder="https://...">
    </div>
    <div class="modal-footer">
      <button class="btn-cancel" onclick="closeAdminModal()">Cancelar</button>
      <button class="btn-save" onclick="saveHero()"><i class="fas fa-save"></i> Salvar</button>
    </div>
  `;
  showAdminModal();
}

function saveHero() {
  const titulo = document.getElementById('hero-titulo').value.trim();
  if (!titulo) { showAdminToast('Digite o título', 'error'); return; }
  const contentSel = document.getElementById('hero-content-id').value;
  const [cid, ctype] = contentSel ? contentSel.split('|') : [null, null];
  const h = {
    id: Date.now(),
    titulo,
    subtitulo: document.getElementById('hero-subtitulo').value.trim(),
    backdrop: document.getElementById('hero-backdrop').value.trim(),
    content_id: cid ? parseInt(cid) : null,
    content_type: ctype || null,
  };
  const hero = DB.get('hero') || [];
  const editIdx = parseInt(document.getElementById('hero-edit-idx').value);
  if (editIdx >= 0) hero[editIdx] = h;
  else hero.push(h);
  DB.set('hero', hero);
  closeAdminModal();
  showAdminToast('Banner salvo!', 'success');
  loadHeroAdmin();
}

function deleteHero(idx) {
  if (!confirm('Remover este banner?')) return;
  const hero = DB.get('hero') || [];
  hero.splice(idx, 1);
  DB.set('hero', hero);
  showAdminToast('Banner removido!', 'success');
  loadHeroAdmin();
}

// ===================== USUÁRIOS =====================
function loadUsuariosAdmin() {
  // Listar usuários da tabela `users` no Supabase
  (async () => {
    try {
      if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase não configurado');
      const sup = window.supabaseClient;
      const { data: users, error } = await sup.from('users').select('*').order('created', { ascending: false });
      if (error) throw error;
      document.getElementById('usuarios-tbody').innerHTML = (users || []).map(u => `
        <tr>
          <td><strong style="color:#ddd">${escHtml(u.name || u.email)}</strong></td>
          <td>${escHtml(u.email || '')}</td>
          <td>${u.created ? new Date(u.created).toLocaleDateString('pt-BR') : '-'}</td>
          <td>
            <button class="btn-delete" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>
      `).join('') || `<tr><td colspan="4" style="text-align:center;color:#666;padding:30px">Nenhum usuário.</td></tr>`;
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      document.getElementById('usuarios-tbody').innerHTML = `<tr><td colspan="4" style="text-align:center;color:#666;padding:30px">Erro ao carregar usuários. Verifique Supabase.</td></tr>`;
    }
  })();
}

function deleteUser(uid) {
  if (!confirm('Remover este usuário?')) return;
  (async () => {
    try {
      if (typeof window.supabaseClient === 'undefined') throw new Error('Supabase não configurado');
      const sup = window.supabaseClient;
      const { error } = await sup.from('users').delete().eq('id', uid);
      if (error) throw error;
      showAdminToast('Usuário removido!', 'success');
      loadUsuariosAdmin();
    } catch (err) {
      console.error('Erro removendo usuário:', err);
      showAdminToast('Erro ao remover usuário: ' + (err.message || err), 'error');
    }
  })();
}

// ===================== CONFIG =====================
function loadConfig() {
  const config = DB.get('config') || {};
  document.getElementById('cfg-sitename').value = config.sitename || 'MegaStreamHD';
  document.getElementById('cfg-banner').value = config.banner || '';
  document.getElementById('cfg-showbanner').value = config.showbanner || '1';
}

function saveConfig() {
  const config = DB.get('config') || {};
  config.sitename = document.getElementById('cfg-sitename').value.trim();
  config.banner = document.getElementById('cfg-banner').value.trim();
  config.showbanner = document.getElementById('cfg-showbanner').value;
  // Admin password is managed via Supabase Auth; do not store plain passwords here.
  DB.set('config', config);
  showAdminToast('Configurações salvas!', 'success');
}

// ===================== MODAL HELPERS =====================
function showAdminModal() {
  document.getElementById('admin-modal-overlay').classList.add('active');
  document.getElementById('admin-modal').classList.add('active');
}

function closeAdminModal() {
  document.getElementById('admin-modal-overlay').classList.remove('active');
  document.getElementById('admin-modal').classList.remove('active');
}

// ===================== TOAST =====================
function showAdminToast(msg, type = '') {
  const t = document.getElementById('toast-admin');
  t.textContent = msg;
  t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = '', 3200);
}

// ===================== UTILS =====================
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
