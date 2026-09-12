import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Bookmark, Check, FileText, Heart, Info, Link2, Maximize2, Minimize2, Plus, Search, X } from 'lucide-react';

type ColorName = 'navy' | 'terracotta' | 'sage' | 'gold' | 'plum';

type ReaderBook = {
  name: string;
  chapters: number;
  testament: string;
};

type ReaderReference = {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  label: string;
};

type ReaderAnnotation = {
  id: string;
  title: string;
  references: ReaderReference[];
};

type ReaderSavedPassage = {
  id: string;
  reference: ReaderReference;
  title: string;
  excerpt: string;
  color: ColorName;
};

type ReaderPreferences = {
  selectedBook: string;
  selectedChapter: number;
  bibleVersion: string;
  readerSize: 'small' | 'medium' | 'large';
  showVerseNumbers: boolean;
};

type BibleVerse = {
  number: number;
  text: string;
};

type VerseMark = {
  highlight: ColorName | null;
  favorite: boolean;
  note: string;
};

type BibleApiPayload = {
  verses?: Array<{ verse?: number; text?: string }>;
};

const VERSE_MARKS_STORAGE = 'caderno-biblico-verse-marks';

const bibleVersions = [
  { id: 'almeida', label: 'Almeida', language: 'Português' },
  { id: 'kjv', label: 'King James', language: 'Inglês' },
  { id: 'web', label: 'World English Bible', language: 'Inglês' },
  { id: 'bbe', label: 'Basic English Bible', language: 'Inglês' },
] as const;

const englishBookNames: Record<string, string> = {
  'Gênesis': 'Genesis',
  'Êxodo': 'Exodus',
  'Levítico': 'Leviticus',
  'Números': 'Numbers',
  'Deuteronômio': 'Deuteronomy',
  'Josué': 'Joshua',
  'Juízes': 'Judges',
  'Rute': 'Ruth',
  '1 Samuel': '1 Samuel',
  '2 Samuel': '2 Samuel',
  '1 Reis': '1 Kings',
  '2 Reis': '2 Kings',
  '1 Crônicas': '1 Chronicles',
  '2 Crônicas': '2 Chronicles',
  'Esdras': 'Ezra',
  'Neemias': 'Nehemiah',
  'Ester': 'Esther',
  'Jó': 'Job',
  'Salmos': 'Psalms',
  'Provérbios': 'Proverbs',
  'Eclesiastes': 'Ecclesiastes',
  'Cânticos': 'Song of Solomon',
  'Isaías': 'Isaiah',
  'Jeremias': 'Jeremiah',
  'Lamentações': 'Lamentations',
  'Ezequiel': 'Ezekiel',
  'Daniel': 'Daniel',
  'Oséias': 'Hosea',
  'Joel': 'Joel',
  'Amós': 'Amos',
  'Obadias': 'Obadiah',
  'Jonas': 'Jonah',
  'Miquéias': 'Micah',
  'Naum': 'Nahum',
  'Habacuque': 'Habakkuk',
  'Sofonias': 'Zephaniah',
  'Ageu': 'Haggai',
  'Zacarias': 'Zechariah',
  'Malaquias': 'Malachi',
  'Mateus': 'Matthew',
  'Marcos': 'Mark',
  'Lucas': 'Luke',
  'João': 'John',
  'Atos': 'Acts',
  'Romanos': 'Romans',
  '1 Coríntios': '1 Corinthians',
  '2 Coríntios': '2 Corinthians',
  'Gálatas': 'Galatians',
  'Efésios': 'Ephesians',
  'Filipenses': 'Philippians',
  'Colossenses': 'Colossians',
  '1 Tessalonicenses': '1 Thessalonians',
  '2 Tessalonicenses': '2 Thessalonians',
  '1 Timóteo': '1 Timothy',
  '2 Timóteo': '2 Timothy',
  'Tito': 'Titus',
  'Filemom': 'Philemon',
  'Hebreus': 'Hebrews',
  'Tiago': 'James',
  '1 Pedro': '1 Peter',
  '2 Pedro': '2 Peter',
  '1 João': '1 John',
  '2 João': '2 John',
  '3 João': '3 John',
  'Judas': 'Jude',
  'Apocalipse': 'Revelation',
};

const sampleVerses: Record<string, string[]> = {
  'João-3': [
    'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
    'Porque Deus enviou o seu Filho ao mundo, não para que condenasse o mundo, mas para que o mundo fosse salvo por ele.',
    'Quem crê nele não é condenado; mas quem não crê já está condenado, porquanto não crê no nome do unigênito Filho de Deus.',
    'E a condenação é esta: que a luz veio ao mundo, e os homens amaram mais as trevas do que a luz, porque as suas obras eram más.',
    'Porque todo aquele que faz o mal odeia a luz e não vem para a luz, para que as suas obras não sejam reprovadas.',
  ],
  'Romanos-8': [
    'Portanto, agora nenhuma condenação há para os que estão em Cristo Jesus.',
    'Porque a lei do Espírito da vida, em Cristo Jesus, me livrou da lei do pecado e da morte.',
    'Porquanto o que era impossível à lei, visto como estava enferma pela carne, Deus, enviando o seu Filho em semelhança da carne do pecado, pelo pecado condenou o pecado na carne.',
    'Para que a justiça da lei se cumprisse em nós, que não andamos segundo a carne, mas segundo o Espírito.',
    'Porque os que são segundo a carne inclinam-se para as coisas da carne; mas os que são segundo o Espírito para as coisas do Espírito.',
  ],
  'Salmos-23': [
    'O Senhor é o meu pastor; nada me faltará.',
    'Deitar-me faz em verdes pastos, guia-me mansamente a águas tranquilas.',
    'Refrigera a minha alma; guia-me pelas veredas da justiça por amor do seu nome.',
    'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo.',
    'Preparas uma mesa perante mim na presença dos meus inimigos; unges a minha cabeça com óleo, o meu cálice transborda.',
  ],
  'Mateus-5': [
    'Vendo as multidões, Jesus subiu ao monte e assentou-se. Seus discípulos aproximaram-se dele.',
    'E, abrindo a sua boca, os ensinava, dizendo:',
    'Bem-aventurados os pobres de espírito, porque deles é o Reino dos céus.',
    'Bem-aventurados os que choram, porque eles serão consolados.',
    'Bem-aventurados os mansos, porque eles herdarão a terra.',
  ],
};

function fallbackFor(book: string, chapter: number): BibleVerse[] {
  const verses = sampleVerses[`${book}-${chapter}`] ?? [
    `Este capítulo de ${book} ${chapter} está pronto para sua leitura.`,
    'Leia devagar. Repare nas palavras que pedem mais tempo e deixe uma anotação quando algo se acender.',
    'O texto completo será carregado para este capítulo. Você pode voltar a ele sempre que quiser.',
  ];
  return verses.map((text, index) => ({ number: index + 1, text }));
}

function makeReaderReference(book: string, chapter: number, verseStart: number, verseEnd?: number): ReaderReference {
  return {
    id: `reader-${book}-${chapter}-${verseStart}-${verseEnd ?? ''}`,
    book,
    chapter,
    verseStart,
    verseEnd,
    label: `${book} ${chapter}:${verseStart}${verseEnd ? `-${verseEnd}` : ''}`,
  };
}

function readVerseMarks(): Record<string, VerseMark> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = window.localStorage.getItem(VERSE_MARKS_STORAGE);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === 'object' ? parsed as Record<string, VerseMark> : {};
  } catch {
    return {};
  }
}

export function BibleReader({
  books,
  preferences,
  annotations,
  saved,
  onPreferences,
  onOpen,
  onSavePassage,
}: {
  books: ReaderBook[];
  preferences: ReaderPreferences;
  annotations: ReaderAnnotation[];
  saved: ReaderSavedPassage[];
  onPreferences: (patch: Partial<ReaderPreferences>) => void;
  onOpen: (reference?: ReaderReference) => void;
  onSavePassage: (passage: ReaderSavedPassage) => void;
}) {
  const currentBook = books.find((book) => book.name === preferences.selectedBook) ?? books[0];
  const [bookSearch, setBookSearch] = useState('');
  const [verses, setVerses] = useState<BibleVerse[]>(() => fallbackFor(preferences.selectedBook, preferences.selectedChapter));
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [verseMarks, setVerseMarks] = useState<Record<string, VerseMark>>(readVerseMarks);
  const [selectedVerseNumber, setSelectedVerseNumber] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteHeight, setNoteHeight] = useState(92);
  const [bubblePosition, setBubblePosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingBubble, setIsDraggingBubble] = useState(false);
  const [isPanelFullscreen, setIsPanelFullscreen] = useState(false);
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const visibleBooks = useMemo(() => {
    const query = bookSearch.trim().toLocaleLowerCase('pt-BR');
    if (!query) return books;
    return books.filter((book) => book.name.toLocaleLowerCase('pt-BR').includes(query));
  }, [bookSearch, books]);

  useEffect(() => {
    const controller = new AbortController();
    const chapterFallback = fallbackFor(preferences.selectedBook, preferences.selectedChapter);
    setVerses(chapterFallback);
    setLoadError('');
    setIsLoading(true);

    const apiBook = preferences.bibleVersion === 'almeida' ? preferences.selectedBook : englishBookNames[preferences.selectedBook] ?? preferences.selectedBook;
    const reference = encodeURIComponent(`${apiBook} ${preferences.selectedChapter}`);
    fetch(`https://bible-api.com/${reference}?translation=${encodeURIComponent(preferences.bibleVersion)}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('chapter-request-failed');
        return response.json() as Promise<BibleApiPayload>;
      })
      .then((payload) => {
        const nextVerses = (payload.verses ?? [])
          .filter((verse): verse is { verse: number; text: string } => typeof verse.verse === 'number' && typeof verse.text === 'string')
          .map((verse) => ({ number: verse.verse, text: verse.text.trim() }));
        if (!nextVerses.length) throw new Error('chapter-empty');
        setVerses(nextVerses);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadError('Não foi possível carregar o texto completo agora. Exibindo uma prévia para você continuar.');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [preferences.selectedBook, preferences.selectedChapter, preferences.bibleVersion]);

  useEffect(() => {
    window.localStorage.setItem(VERSE_MARKS_STORAGE, JSON.stringify(verseMarks));
  }, [verseMarks]);

  useEffect(() => {
    setSelectedVerseNumber(null);
    setNoteDraft('');
    setNoteSaved(false);
    setBubblePosition(null);
    verseRefs.current = {};
  }, [preferences.selectedBook, preferences.selectedChapter]);

  useEffect(() => {
    if (!isDraggingBubble) return;
    const handlePointerMove = (event: PointerEvent) => {
      const bubble = bubbleRef.current;
      if (!bubble || !dragState.current) return;
      const maxX = Math.max(12, window.innerWidth - bubble.offsetWidth - 12);
      const maxY = Math.max(12, window.innerHeight - bubble.offsetHeight - 12);
      const x = Math.min(maxX, Math.max(12, event.clientX - dragState.current.offsetX));
      const y = Math.min(maxY, Math.max(12, event.clientY - dragState.current.offsetY));
      setBubblePosition({ x, y });
    };
    const stopDragging = () => {
      dragState.current = null;
      setIsDraggingBubble(false);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
    };
  }, [isDraggingBubble]);

  const related = annotations.filter((annotation) => annotation.references.some((reference) => reference.book === preferences.selectedBook && reference.chapter === preferences.selectedChapter));
  const currentReference = makeReaderReference(preferences.selectedBook, preferences.selectedChapter, 1, verses[verses.length - 1]?.number);
  const verseKey = (number: number) => `${preferences.selectedBook}-${preferences.selectedChapter}-${number}`;
  const selectedMark = selectedVerseNumber === null ? undefined : verseMarks[verseKey(selectedVerseNumber)];
  const selectedReference = selectedVerseNumber === null ? currentReference : makeReaderReference(preferences.selectedBook, preferences.selectedChapter, selectedVerseNumber);
  const updateSelectedMark = (patch: Partial<VerseMark>) => {
    if (selectedVerseNumber === null) return;
    setVerseMarks((current) => {
      const key = verseKey(selectedVerseNumber);
      const previous = current[key] ?? { highlight: null, favorite: false, note: '' };
      return { ...current, [key]: { ...previous, ...patch } };
    });
  };
  const selectVerse = (verse: BibleVerse) => {
    setSelectedVerseNumber(verse.number);
    setNoteDraft(verseMarks[verseKey(verse.number)]?.note ?? '');
    setNoteSaved(false);
  };
  const goToVerse = (verse: BibleVerse) => {
    selectVerse(verse);
    window.requestAnimationFrame(() => verseRefs.current[verse.number]?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const startBubbleDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const rect = bubble.getBoundingClientRect();
    dragState.current = { offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    setBubblePosition({ x: rect.left, y: rect.top });
    setIsDraggingBubble(true);
    event.preventDefault();
  };
  const saveVerseNote = () => {
    updateSelectedMark({ note: noteDraft.trim() });
    setNoteSaved(true);
  };

  // 5-second auto-save timer for verse notes
  useEffect(() => {
    if (selectedVerseNumber === null || !noteDraft.trim()) return;
    const timer = setInterval(() => {
      saveVerseNote();
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedVerseNumber, noteDraft]);
  const currentPassage: ReaderSavedPassage = {
    id: `passage-${preferences.selectedBook}-${preferences.selectedChapter}`,
    reference: currentReference,
    title: `Leitura de ${currentBook.name}`,
    excerpt: verses[0]?.text ?? '',
    color: 'sage',
  };
  const isSaved = saved.some((passage) => passage.reference.label === currentPassage.reference.label);
  const readerSize = preferences.readerSize === 'small' ? '17px' : preferences.readerSize === 'large' ? '23px' : '20px';

  return (
    <section className="page">
      <div className="eyebrow">leitura com calma</div>
      <h1 className="page-title">Ler a Bíblia</h1>
      <p className="page-intro">Toda a Bíblia em um leitor feito para telas pequenas. Escolha um livro, encontre um capítulo e deixe a leitura abrir uma nova pergunta.</p>
      <div className="reader-layout">
        <div className="paper-card book-browser">
          <div className="book-browser-heading">
            <div>
              <div className="browser-title">Livros</div>
              <p className="book-browser-meta">66 livros · 1.189 capítulos</p>
            </div>
            <span className="testament-count">{visibleBooks.length}</span>
          </div>
          <div className="book-search">
            <Search size={14} />
            <input value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} placeholder="Encontrar livro" aria-label="Buscar livro da Bíblia" />
          </div>
          <div className="book-list">
            {visibleBooks.map((book) => (
              <button type="button" className={`book-button ${book.name === preferences.selectedBook ? 'selected' : ''}`} onClick={() => onPreferences({ selectedBook: book.name, selectedChapter: 1 })} key={book.name} data-testid={`button-book-${book.name}`}>
                <span>{book.name}</span>
                <span>{book.chapters}</span>
              </button>
            ))}
            {!visibleBooks.length && <span className="book-empty">Nenhum livro encontrado.</span>}
          </div>
        </div>
        <div className="paper-card reader-paper">
          <div className="reader-toolbar">
            <div className="reader-kicker"><BookOpen size={13} /> {currentBook.testament}</div>
            <label className="reader-version">
              <span>Versão</span>
              <select value={preferences.bibleVersion} onChange={(event) => onPreferences({ bibleVersion: event.target.value })} aria-label="Escolher versão da Bíblia" data-testid="select-bible-version">
                {bibleVersions.map((version) => <option value={version.id} key={version.id}>{version.label} · {version.language}</option>)}
              </select>
            </label>
          </div>
          <h2 className="reader-title">{preferences.selectedBook}</h2>
          <p className="reader-sub">1. Escolha o capítulo e depois toque em um número de versículo para ir direto até ele.</p>
          <div className="chapter-scroll" aria-label={`Capítulos de ${currentBook.name}`}>
            {Array.from({ length: currentBook.chapters }, (_, index) => index + 1).map((chapter) => (
              <button type="button" className={`chapter-button ${chapter === preferences.selectedChapter ? 'selected' : ''}`} onClick={() => onPreferences({ selectedChapter: chapter })} key={chapter} data-testid={`button-chapter-${chapter}`}>{chapter}</button>
            ))}
          </div>
          <div className="reader-source">{bibleVersions.find((version) => version.id === preferences.bibleVersion)?.label ?? 'Bíblia'} · texto completo por capítulo</div>
          {isLoading && <div className="reader-status">Carregando o texto completo…</div>}
          {loadError && <div className="reader-status warning"><Info size={14} /> {loadError}</div>}
          <div className="verse-picker">
            <div className="picker-heading"><span className="picker-step">2</span><div><strong>Versículos</strong><small>Escolha um número para abrir o trecho</small></div></div>
            <div className="verse-number-scroll" aria-label={`Versículos de ${currentBook.name} ${preferences.selectedChapter}`}>
              {verses.map((verse) => <button type="button" className={`verse-number-button ${selectedVerseNumber === verse.number ? 'selected' : ''}`} onClick={() => goToVerse(verse)} key={verse.number} data-testid={`button-verse-${verse.number}`}>{verse.number}</button>)}
            </div>
          </div>
          <div className="reader-selection-hint"><span>Toque em um versículo para marcar, pintar ou escrever uma nota.</span><span>{Object.values(verseMarks).filter((mark) => mark.note || mark.favorite || mark.highlight).length} marcados</span></div>
          <div className="verse-list">
            {verses.map((verse) => (
              <div
                className={`verse ${verseMarks[verseKey(verse.number)]?.highlight ? `highlight-${verseMarks[verseKey(verse.number)].highlight}` : ''} ${selectedVerseNumber === verse.number ? 'selected' : ''}`}
                key={`${currentReference.label}-${verse.number}`}
                onClick={() => selectVerse(verse)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectVerse(verse); } }}
                role="button"
                tabIndex={0}
                ref={(node) => { verseRefs.current[verse.number] = node; }}
                aria-pressed={selectedVerseNumber === verse.number}
                data-testid={`verse-${verse.number}`}
              >
                <div className="verse-number" style={{ visibility: preferences.showVerseNumbers ? 'visible' : 'hidden' }}>{verse.number}</div>
                <div className="verse-content">
                  <p className="verse-text" style={{ '--reader-size': readerSize } as CSSProperties}>{verse.text}</p>
                  {(verseMarks[verseKey(verse.number)]?.note || verseMarks[verseKey(verse.number)]?.favorite) && <span className="verse-mark-indicator"><FileText size={11} /> {verseMarks[verseKey(verse.number)]?.favorite ? 'Favorito' : 'Nota adicionada'}</span>}
                </div>
              </div>
            ))}
          </div>
          {selectedVerseNumber !== null && <div className={`verse-study-panel floating ${isPanelFullscreen ? 'fullscreen' : ''} ${isDraggingBubble ? 'dragging' : ''}`} ref={bubbleRef} style={bubblePosition && !isPanelFullscreen ? { left: bubblePosition.x, top: bubblePosition.y, right: 'auto', bottom: 'auto' } : undefined}>
            <div className="study-panel-heading drag-handle" onPointerDown={startBubbleDrag} title="Arraste para mover o balão">
              <div><div className="eyebrow">estudo do versículo</div><h3>{preferences.selectedBook} {preferences.selectedChapter}:{selectedVerseNumber}</h3></div>
              <div className="study-panel-heading-actions">
                <button type="button" className="study-close" onClick={() => setIsPanelFullscreen(!isPanelFullscreen)} title={isPanelFullscreen ? "Restaurar tamanho" : "Preencher a tela com o balão"} aria-label="Preencher tela" data-testid="button-toggle-fullscreen-bubble">
                  {isPanelFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                <button type="button" className={`study-favorite ${selectedMark?.favorite ? 'active' : ''}`} onClick={() => updateSelectedMark({ favorite: !selectedMark?.favorite })} aria-label={selectedMark?.favorite ? 'Remover versículo dos favoritos' : 'Favoritar versículo'} data-testid="button-favorite-verse"><Heart size={18} fill={selectedMark?.favorite ? 'currentColor' : 'none'} /></button>
                <button type="button" className="study-close" onClick={() => { setSelectedVerseNumber(null); setIsPanelFullscreen(false); }} aria-label="Fechar balão do versículo" data-testid="button-close-verse-bubble"><X size={15} /></button>
              </div>
            </div>
            <div className="study-color-row"><span>Cor da marcação</span><div className="verse-color-picker">{(['gold', 'sage', 'terracotta', 'plum', 'navy'] as ColorName[]).map((color) => <button type="button" className={`verse-color-button ${color} ${selectedMark?.highlight === color ? 'active' : ''}`} onClick={() => updateSelectedMark({ highlight: color })} key={color} aria-label={`Pintar versículo de ${color}`} data-testid={`button-highlight-${color}`} />)}<button type="button" className="verse-color-clear" onClick={() => updateSelectedMark({ highlight: null })} aria-label="Remover cor do versículo" data-testid="button-clear-highlight"><X size={13} /></button></div></div>
            <div className="study-note-heading">
              <label className="study-note-label" htmlFor="verse-note">Minha nota</label>
              <button
                type="button"
                className="study-fullscreen-btn"
                onClick={() => {
                  saveVerseNote();
                  setSelectedVerseNumber(null);
                  setIsPanelFullscreen(false);
                  onOpen(selectedReference);
                }}
                title="Escrever em Tela Cheia"
                aria-label="Escrever nota em Tela Cheia"
                data-testid="button-fullscreen-verse-note"
              >
                <Maximize2 size={13} />
                <span>Tela cheia</span>
              </button>
            </div>
            <textarea id="verse-note" className="study-note-input" style={{ minHeight: `${noteHeight}px` }} value={noteDraft} onChange={(event) => { setNoteDraft(event.target.value); setNoteSaved(false); }} onBlur={saveVerseNote} placeholder="O que este versículo despertou em você?" data-testid="input-verse-note" />
            
            {annotations.length > 0 && (
              <div className="study-link-note-section">
                <label htmlFor="select-link-study" className="study-link-label"><Link2 size={12} /> Vincular a uma nota existente:</label>
                <select
                  id="select-link-study"
                  className="study-link-select"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      saveVerseNote();
                      setSelectedVerseNumber(null);
                      setIsPanelFullscreen(false);
                      onOpen(selectedReference);
                    }
                  }}
                  data-testid="select-link-study"
                >
                  <option value="" disabled>-- Conectar versículo a um estudo --</option>
                  {annotations.map((ann) => (
                    <option key={ann.id} value={ann.id}>{ann.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="study-drag-hint">Arraste o cabeçalho para mover este balão.</div>
            <div className="study-panel-footer"><span>{noteSaved && <><Check size={13} /> Nota salva</>}</span><button type="button" className="primary-button" onClick={saveVerseNote} data-testid="button-save-verse-note"><Check size={14} /> Salvar nota</button></div>
          </div>}
          <div className="verse-actions">
            <button type="button" className="primary-button" onClick={() => onOpen(selectedReference)} data-testid="button-note-from-reader"><Plus size={15} /> Anotar {selectedVerseNumber === null ? 'nesta passagem' : 'neste versículo'}</button>
            <button type="button" className="outline-button" onClick={() => onSavePassage(currentPassage)} data-testid="button-save-passage"><Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Leitura guardada' : 'Guardar leitura'}</button>
          </div>
          {related.length > 0 && <div className="related-note"><div className="eyebrow">suas anotações aqui</div><div className="pill-row">{related.map((annotation) => <span className="pill" key={annotation.id}><FileText size={10} style={{ verticalAlign: '-2px', marginRight: 4 }} />{annotation.title}</span>)}</div></div>}
        </div>
      </div>
    </section>
  );
}