let notes = [
  { id: '1', titulo: 'Lembretes', texto: 'Comprar leite e pão', criadoEm: '2025-04-29T10:00:00Z', tag: 'personal' },
  { id: '2', titulo: 'Tarefas do trabalho', texto: 'Enviar relatório até sexta-feira', criadoEm: '2025-04-29T10:00:00Z', tag: 'work' },
  { id: '3', titulo: 'Estudos', texto: 'Revisar módulo de Node.js', criadoEm: '2025-04-29T10:00:00Z', tag: 'ideas' },
  { id: '4', titulo: 'Pessoal', texto: 'Ligar para mãe no final de semana', criadoEm: '2025-04-29T10:00:00Z', tag: 'personal' },
  { id: '5', titulo: 'Lazer', texto: 'Assistir o novo episódio da série', criadoEm: '2025-04-29T10:00:00Z', tag: 'ideas' },
];

export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method === 'GET') return response.status(200).json(notes);

  if (request.method === 'POST') {
    const note = {
      id: Date.now().toString(),
      titulo: request.body?.titulo || '',
      texto: request.body?.texto || '',
      tag: request.body?.tag || 'personal',
      criadoEm: new Date().toISOString(),
    };
    notes = [...notes, note];
    return response.status(201).json(note);
  }

  const noteId = request.query?.id;
  const noteIndex = notes.findIndex((note) => note.id === noteId);
  if (noteIndex < 0) return response.status(404).json({ erro: 'Nota não encontrada' });

  if (request.method === 'PUT') {
    const updatedNote = {
      ...notes[noteIndex],
      titulo: request.body?.titulo ?? notes[noteIndex].titulo,
      texto: request.body?.texto ?? notes[noteIndex].texto,
      tag: request.body?.tag ?? notes[noteIndex].tag,
      atualizadoEm: new Date().toISOString(),
    };
    notes = notes.map((note, index) => index === noteIndex ? updatedNote : note);
    return response.status(200).json(updatedNote);
  }

  if (request.method === 'DELETE') {
    notes = notes.filter((note) => note.id !== noteId);
    return response.status(200).json({ mensagem: 'Nota removida' });
  }

  return response.status(405).json({ erro: 'Método não permitido' });
}