import { useEffect, useMemo, useState } from 'react';

const API_URL = 'https://projeto-notas-seven.vercel.app/api/notes';
const FOLDERS = [
  { id: 'work', label: 'Trabalho', color: 'work' },
  { id: 'personal', label: 'Pessoal', color: 'personal' },
  { id: 'ideas', label: 'Ideias', color: 'ideas' },
];

const getNoteDate = (note) => note.criadoEm || note.atualizadoEm;

const inferFolder = (note) => {
  const content = `${note.titulo} ${note.texto}`.toLowerCase();
  if (/trabalho|relatório|reunião|projeto|tarefa/.test(content)) return 'work';
  if (/pessoal|mãe|comprar|leite|pão|casa/.test(content)) return 'personal';
  return 'ideas';
};

const formatDate = (value) => {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date).replace('.', '');
};

async function request(url = API_URL, options = {}) {
  const requestOptions = { ...options };
  if (requestOptions.body) requestOptions.headers = { 'Content-Type': 'application/json', ...(requestOptions.headers || {}) };
  const response = await fetch(url, requestOptions);
  if (!response.ok) throw new Error('Não foi possível concluir a operação.');
  return response.json();
}

function App() {
  const [notes, setNotes] = useState([]);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('appdata-favorites') || '[]'));
  const [noteTags, setNoteTags] = useState(() => JSON.parse(localStorage.getItem('appdata-note-tags') || '{}'));
  const [activeView, setActiveView] = useState('all');
  const [activeFolder, setActiveFolder] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [selectedId, setSelectedId] = useState(null);
  const [editor, setEditor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    request().then(setNotes).catch(() => setError('Não foi possível carregar as notas. Verifique se a API publicada está disponível.')).finally(() => setLoading(false));
  }, []);

  useEffect(() => localStorage.setItem('appdata-favorites', JSON.stringify(favorites)), [favorites]);
  useEffect(() => localStorage.setItem('appdata-note-tags', JSON.stringify(noteTags)), [noteTags]);

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...notes].filter((note) => {
      const matchesSearch = !term || `${note.titulo} ${note.texto}`.toLowerCase().includes(term);
      const matchesView = activeView === 'all' || (activeView === 'favorites' && favorites.includes(note.id));
      const matchesFolder = !activeFolder || (noteTags[note.id] || note.tag || inferFolder(note)) === activeFolder;
      return matchesSearch && matchesView && matchesFolder;
    }).sort((a, b) => sort === 'alphabetical' ? (a.titulo || '').localeCompare(b.titulo || '') : new Date(getNoteDate(b) || 0) - new Date(getNoteDate(a) || 0));
  }, [activeFolder, activeView, favorites, noteTags, notes, search, sort]);

  const openNewNote = () => { setError(''); setEditor({ titulo: '', texto: '', tag: activeFolder || 'personal', isNew: true }); };
  const openNote = (note) => { setSelectedId(note.id); setEditor({ ...note, tag: noteTags[note.id] || note.tag || inferFolder(note), isNew: false }); };

  const saveNote = async (event) => {
    event.preventDefault();
    if (!editor.titulo.trim() || !editor.texto.trim()) return;
    setSaving(true); setError('');
    try {
      const saved = await request(editor.isNew ? API_URL : `${API_URL}?id=${encodeURIComponent(editor.id)}`, {
        method: editor.isNew ? 'POST' : 'PUT',
        body: JSON.stringify({ titulo: editor.titulo, texto: editor.texto, tag: editor.tag }),
      });
      setNoteTags((current) => ({ ...current, [saved.id]: editor.tag || 'personal' }));
      setNotes((current) => editor.isNew ? [...current, saved] : current.map((note) => note.id === saved.id ? saved : note));
      setSelectedId(saved.id); setEditor({ ...saved, tag: editor.tag, isNew: false });
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };

  const deleteNote = async (note) => {
    if (note.isNew) { setEditor(null); return; }
    if (!window.confirm(`Excluir “${note.titulo}”?`)) return;
    try { await request(`${API_URL}?id=${encodeURIComponent(note.id)}`, { method: 'DELETE' }); }
    catch { setError('Não foi possível excluir a nota.'); return; }
    setNotes((current) => current.filter((item) => item.id !== note.id));
    setFavorites((current) => current.filter((id) => id !== note.id)); setSelectedId(null); setEditor(null);
  };

  const toggleFavorite = (id) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const favoriteCount = favorites.filter((id) => notes.some((note) => note.id === id)).length;
  const folderCount = (folderId) => notes.filter((note) => (noteTags[note.id] || note.tag || inferFolder(note)) === folderId).length;
  const pageTitle = activeFolder ? FOLDERS.find((folder) => folder.id === activeFolder)?.label : activeView === 'favorites' ? 'Favoritas' : activeView === 'trash' ? 'Lixeira' : 'Todas as notas';

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><img className="note-logo" src="/logo.svg" alt="Logo Notas" /><h1>Notas</h1></div>
        <button className="new-note-button" onClick={openNewNote}><span className="button-symbol">+</span> Nova nota</button>
        <nav className="main-nav" aria-label="Filtros de notas">
          <button className={activeView === 'all' && !activeFolder ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveView('all'); setActiveFolder(null); }}><img className="nav-icon" src="/icons/notes.svg" alt="" /> Todas as notas <b>{notes.length}</b></button>
          <button className={activeView === 'favorites' && !activeFolder ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveView('favorites'); setActiveFolder(null); }}><img className="nav-icon" src="/icons/favorites.svg" alt="" /> Favoritas <b>{favoriteCount}</b></button>
          <button className={activeView === 'trash' ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveView('trash'); setActiveFolder(null); }}><img className="nav-icon" src="/icons/trash.svg" alt="" /> Lixeira</button>
        </nav>
        <div className="folders"><p>Pastas</p>{FOLDERS.map((folder) => <button key={folder.id} className={activeFolder === folder.id ? 'folder-active' : ''} onClick={() => { setActiveFolder(activeFolder === folder.id ? null : folder.id); setActiveView('all'); }}><i className={`folder-dot ${folder.color}`} /> {folder.label}<b>{folderCount(folder.id)}</b></button>)}</div>
        <div className="sidebar-footer"><span className="status-dot" /> API conectada localmente</div>
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar notas" /></label>
          <label className="sort-box"><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Ordenar notas"><option value="recent">Mais recentes</option><option value="alphabetical">Ordem alfabética</option></select><span>⌄</span></label>
        </header>
        <div className="content">
          <div className="content-heading"><div><p className="eyebrow">Seu espaço pessoal</p><h2>{pageTitle}</h2></div><span className="result-count">{filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}</span></div>
          {error && <div className="error-banner">{error}<button onClick={() => setError('')}>×</button></div>}
          {loading ? <div className="empty-state"><span className="loader" />Carregando suas notas...</div> : activeView === 'trash' ? <div className="empty-state"><span className="empty-icon">□</span>A lixeira está vazia.</div> : <div className="notes-grid">{filteredNotes.map((note, index) => <NoteCard key={note.id} note={note} index={index} isFavorite={favorites.includes(note.id)} isSelected={selectedId === note.id} onOpen={openNote} onFavorite={toggleFavorite} />)}<button className="new-note-card" onClick={openNewNote}><span className="button-symbol">+</span><strong>Nova nota</strong></button></div>}
        </div>
      </section>
      {editor && <NoteEditor note={editor} saving={saving} onChange={setEditor} onSave={saveNote} onDelete={deleteNote} onClose={() => setEditor(null)} />}
    </main>
  );
}

function NoteCard({ note, index, isFavorite, isSelected, onOpen, onFavorite }) {
  return <article className={`note-card ${isSelected ? 'selected' : ''}`} style={{ '--delay': `${index * 70}ms` }} onClick={() => onOpen(note)}>
    <div className="card-top"><h3>{note.titulo}</h3><button className={isFavorite ? 'favorite is-favorite' : 'favorite'} onClick={(event) => { event.stopPropagation(); onFavorite(note.id); }} aria-label="Favoritar nota">{isFavorite ? '★' : '☆'}</button></div><p>{note.texto}</p><time>{formatDate(getNoteDate(note))}</time>
  </article>;
}

function NoteEditor({ note, saving, onChange, onSave, onDelete, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="editor" onSubmit={onSave}>
    <div className="editor-header"><span>{note.isNew ? 'NOVA NOTA' : 'EDITAR NOTA'}</span><button type="button" onClick={onClose} aria-label="Fechar">×</button></div>
    <input className="editor-title" value={note.titulo} onChange={(event) => onChange({ ...note, titulo: event.target.value })} placeholder="Título da nota" autoFocus />
    <textarea value={note.texto} onChange={(event) => onChange({ ...note, texto: event.target.value })} placeholder="Comece a escrever..." rows="9" />
    <label className="tag-field">Pasta<select value={note.tag || 'personal'} onChange={(event) => onChange({ ...note, tag: event.target.value })}>{FOLDERS.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</select></label>
    <div className="editor-actions"><button type="button" className="delete-button" onClick={() => onDelete(note)}>{note.isNew ? 'Cancelar' : 'Excluir'}</button><button className="save-button" disabled={saving || !note.titulo.trim() || !note.texto.trim()}>{saving ? 'Salvando...' : 'Salvar nota'}</button></div>
  </form></div>;
}

export default App;