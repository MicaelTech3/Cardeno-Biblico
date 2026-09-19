import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode, type CSSProperties } from 'react';
import {
  Archive,
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  Feather,
  FileText,
  Grid,
  Heart,
  Home,
  Info,
  Link2,
  LogOut,
  Maximize2,
  Menu,
  MessageSquare,
  Minimize2,
  PenLine,
  Plus,
  Repeat,
  Search,
  Send,
  Copy,
  Share2,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  GraduationCap,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Redirect, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BibleReader } from '@/components/bible-reader';
import { BibleLearningView } from '@/components/bible-learning';
import { InvestigationBoardModal } from '@/components/investigation-board';
import { t, Language } from '@/i18n';
import { 
  db, 
  auth,
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  signInWithGoogle, 
  logoutFirebase, 
  onAuthStateChanged, 
  safeSetDoc,
  sanitizeForFirestore,
  type FirebaseUser 
} from '@/lib/firebase';

const clerkEnvKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkConfigured = Boolean(clerkEnvKey && !clerkEnvKey.includes('sample') && clerkEnvKey.startsWith('pk_'));
const clerkPubKey = isClerkConfigured ? publishableKeyFromHost(window.location.hostname, clerkEnvKey) : '';
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';

const useAppUser = isClerkConfigured
  ? useUser
  : () => ({ user: null, isLoaded: true, isSignedIn: false });

const useAppClerk = isClerkConfigured
  ? useClerk
  : () => ({ signOut: async () => {} });

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#c75b3d',
    colorForeground: '#253044',
    colorMutedForeground: '#667085',
    colorDanger: '#b33f35',
    colorBackground: '#fbf8f1',
    colorInput: '#fffdf8',
    colorInputForeground: '#253044',
    colorNeutral: '#d8d0c2',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbf8f1] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_20px_60px_rgba(48,39,27,0.12)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#253044] font-serif',
    headerSubtitle: 'text-[#667085]',
    socialButtonsBlockButtonText: 'text-[#253044]',
    formFieldLabel: 'text-[#253044]',
    footerActionLink: 'text-[#c75b3d]',
    footerActionText: 'text-[#667085]',
    dividerText: 'text-[#667085]',
    identityPreviewEditButton: 'text-[#c75b3d]',
    formFieldSuccessText: 'text-[#387454]',
    alertText: 'text-[#b33f35]',
    logoBox: 'h-12',
    logoImage: 'h-12 w-12 rounded-xl',
    socialButtonsBlockButton: 'border-[#d8d0c2] bg-[#fffdf8] hover:bg-[#f2eadf]',
    formButtonPrimary: 'bg-[#c75b3d] hover:bg-[#ad4d33] text-[#fffaf1]',
    formFieldInput: 'border-[#d8d0c2] bg-[#fffdf8] text-[#253044]',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-[#d8d0c2]',
    alert: 'border-[#e6b7ae] bg-[#f9e8e4]',
    otpCodeFieldInput: 'border-[#d8d0c2] bg-[#fffdf8] text-[#253044]',
    formFieldRow: 'gap-1',
    main: 'bg-transparent',
  },
};

type ColorName = 'navy' | 'terracotta' | 'sage' | 'gold' | 'plum';
type AnnotationStatus = 'draft' | 'finalized';

type BibleReference = {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  label: string;
};

type Comment = {
  id: string;
  authorName: string;
  authorPhoto?: string;
  text: string;
  createdAt: string;
};

type Annotation = {
  id: string;
  authorId?: string;
  authorName: string;
  authorInitial: string;
  authorPhoto?: string;
  title: string;
  mainPoint: string;
  phrases: string[];
  references: BibleReference[];
  tags: string[];
  color: ColorName;
  status: AnnotationStatus;
  published: boolean;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  linkedAnnotationIds: string[];
  likesCount?: number;
  likedBy?: string[];
  repostsCount?: number;
  comments?: Comment[];
};

type SavedPassage = {
  id: string;
  authorId?: string;
  reference: BibleReference;
  title: string;
  excerpt: string;
  color: ColorName;
};

type SharedNote = {
  id: string;
  originalNoteId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  recipientId: string;
  recipientName: string;
  title: string;
  mainPoint: string;
  phrases: string[];
  references: BibleReference[];
  tags: string[];
  color: ColorName;
  createdAt: string;
};

type SystemFontSize = 'small' | 'medium' | 'large' | 'xlarge';
type NavigationMode = 'top' | 'bottom';

type Preferences = {
  selectedBook: string;
  selectedChapter: number;
  bibleVersion: string;
  language: 'pt-BR' | 'en';
  theme: 'light' | 'dark';
  readerSize: 'small' | 'medium' | 'large';
  showVerseNumbers: boolean;
  systemFontSize?: SystemFontSize;
  navigationMode?: NavigationMode;
};

type BibleVerse = {
  number: number;
  text: string;
};

type View = 'overview' | 'feed' | 'notes' | 'reader' | 'preferences' | 'profiles' | 'learn';

type AppNotification = {
  id: string;
  recipientId?: string;
  type: 'follow' | 'like' | 'repost' | 'comment' | 'unfinished' | 'send';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  authorName?: string;
  authorPhoto?: string;
  annotationId?: string;
};

type AnnotationDraft = Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;

const STORAGE = {
  annotations: 'caderno-biblico-annotations',
  legacyNotes: 'caderno-biblico-notes',
  saved: 'caderno-biblico-saved-passages',
  preferences: 'caderno-biblico-preferences',
};

const books = [
  { name: 'Gênesis', chapters: 50, testament: 'Antigo Testamento' },
  { name: 'Êxodo', chapters: 40, testament: 'Antigo Testamento' },
  { name: 'Levítico', chapters: 27, testament: 'Antigo Testamento' },
  { name: 'Números', chapters: 36, testament: 'Antigo Testamento' },
  { name: 'Deuteronômio', chapters: 34, testament: 'Antigo Testamento' },
  { name: 'Josué', chapters: 24, testament: 'Antigo Testamento' },
  { name: 'Juízes', chapters: 21, testament: 'Antigo Testamento' },
  { name: 'Rute', chapters: 4, testament: 'Antigo Testamento' },
  { name: '1 Samuel', chapters: 31, testament: 'Antigo Testamento' },
  { name: '2 Samuel', chapters: 24, testament: 'Antigo Testamento' },
  { name: '1 Reis', chapters: 22, testament: 'Antigo Testamento' },
  { name: '2 Reis', chapters: 25, testament: 'Antigo Testamento' },
  { name: '1 Crônicas', chapters: 29, testament: 'Antigo Testamento' },
  { name: '2 Crônicas', chapters: 36, testament: 'Antigo Testamento' },
  { name: 'Esdras', chapters: 10, testament: 'Antigo Testamento' },
  { name: 'Neemias', chapters: 13, testament: 'Antigo Testamento' },
  { name: 'Ester', chapters: 10, testament: 'Antigo Testamento' },
  { name: 'Jó', chapters: 42, testament: 'Antigo Testamento' },
  { name: 'Salmos', chapters: 150, testament: 'Antigo Testamento' },
  { name: 'Provérbios', chapters: 31, testament: 'Antigo Testamento' },
  { name: 'Eclesiastes', chapters: 12, testament: 'Antigo Testamento' },
  { name: 'Cânticos', chapters: 8, testament: 'Antigo Testamento' },
  { name: 'Isaías', chapters: 66, testament: 'Antigo Testamento' },
  { name: 'Jeremias', chapters: 52, testament: 'Antigo Testamento' },
  { name: 'Lamentações', chapters: 5, testament: 'Antigo Testamento' },
  { name: 'Ezequiel', chapters: 48, testament: 'Antigo Testamento' },
  { name: 'Daniel', chapters: 12, testament: 'Antigo Testamento' },
  { name: 'Oséias', chapters: 14, testament: 'Antigo Testamento' },
  { name: 'Joel', chapters: 3, testament: 'Antigo Testamento' },
  { name: 'Amós', chapters: 9, testament: 'Antigo Testamento' },
  { name: 'Obadias', chapters: 1, testament: 'Antigo Testamento' },
  { name: 'Jonas', chapters: 4, testament: 'Antigo Testamento' },
  { name: 'Miquéias', chapters: 7, testament: 'Antigo Testamento' },
  { name: 'Naum', chapters: 3, testament: 'Antigo Testamento' },
  { name: 'Habacuque', chapters: 3, testament: 'Antigo Testamento' },
  { name: 'Sofonias', chapters: 3, testament: 'Antigo Testamento' },
  { name: 'Ageu', chapters: 2, testament: 'Antigo Testamento' },
  { name: 'Zacarias', chapters: 14, testament: 'Antigo Testamento' },
  { name: 'Malaquias', chapters: 4, testament: 'Antigo Testamento' },
  { name: 'Mateus', chapters: 28, testament: 'Novo Testamento' },
  { name: 'Marcos', chapters: 16, testament: 'Novo Testamento' },
  { name: 'Lucas', chapters: 24, testament: 'Novo Testamento' },
  { name: 'João', chapters: 21, testament: 'Novo Testamento' },
  { name: 'Atos', chapters: 28, testament: 'Novo Testamento' },
  { name: 'Romanos', chapters: 16, testament: 'Novo Testamento' },
  { name: '1 Coríntios', chapters: 16, testament: 'Novo Testamento' },
  { name: '2 Coríntios', chapters: 13, testament: 'Novo Testamento' },
  { name: 'Gálatas', chapters: 6, testament: 'Novo Testamento' },
  { name: 'Efésios', chapters: 6, testament: 'Novo Testamento' },
  { name: 'Filipenses', chapters: 4, testament: 'Novo Testamento' },
  { name: 'Colossenses', chapters: 4, testament: 'Novo Testamento' },
  { name: '1 Tessalonicenses', chapters: 5, testament: 'Novo Testamento' },
  { name: '2 Tessalonicenses', chapters: 3, testament: 'Novo Testamento' },
  { name: '1 Timóteo', chapters: 6, testament: 'Novo Testamento' },
  { name: '2 Timóteo', chapters: 4, testament: 'Novo Testamento' },
  { name: 'Tito', chapters: 3, testament: 'Novo Testamento' },
  { name: 'Filemom', chapters: 1, testament: 'Novo Testamento' },
  { name: 'Hebreus', chapters: 13, testament: 'Novo Testamento' },
  { name: 'Tiago', chapters: 5, testament: 'Novo Testamento' },
  { name: '1 Pedro', chapters: 5, testament: 'Novo Testamento' },
  { name: '2 Pedro', chapters: 3, testament: 'Novo Testamento' },
  { name: '1 João', chapters: 5, testament: 'Novo Testamento' },
  { name: '2 João', chapters: 1, testament: 'Novo Testamento' },
  { name: '3 João', chapters: 1, testament: 'Novo Testamento' },
  { name: 'Judas', chapters: 1, testament: 'Novo Testamento' },
  { name: 'Apocalipse', chapters: 22, testament: 'Novo Testamento' },
];

const verseSamples: Record<string, string[]> = {
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
  'Filipenses-4': [
    'Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos.',
    'Seja a vossa moderação conhecida de todos os homens. Perto está o Senhor.',
    'Não andeis ansiosos por coisa alguma; antes, em tudo sejam os vossos pedidos conhecidos diante de Deus.',
  ],
};

function getVerseText(ref: BibleReference): string {
  const key = `${ref.book}-${ref.chapter}`;
  const list = verseSamples[key];
  if (list && list.length > 0) {
    const idx = Math.max(0, Math.min(list.length - 1, (ref.verseStart || 1) - 1));
    return list[idx];
  }
  return `Leitura de ${ref.label}. Acesse a Bíblia para consultar a passagem completa.`;
}

const defaultPreferences: Preferences = {
  selectedBook: 'João',
  selectedChapter: 3,
  bibleVersion: 'almeida',
  language: 'pt-BR',
  theme: 'light',
  readerSize: 'medium',
  showVerseNumbers: true,
  systemFontSize: 'medium',
  navigationMode: 'top',
};

const makeReference = (book: string, chapter: number, verseStart: number, verseEnd?: number): BibleReference => {
  const label = `${book} ${chapter}:${verseStart}${verseEnd ? `-${verseEnd}` : ''}`;
  return { id: `ref-${book}-${chapter}-${verseStart}-${verseEnd ?? ''}`.replace(/\s/g, '-'), book, chapter, verseStart, verseEnd, label };
};

const seedReference = (book: string, chapter: number, verseStart: number, verseEnd?: number) => makeReference(book, chapter, verseStart, verseEnd);

const seededAnnotations: Annotation[] = [
  {
    id: 'seed-1',
    authorName: 'Mariana Costa',
    authorInitial: 'M',
    title: 'O amor que toma a iniciativa',
    mainPoint: 'João 3:16 não começa comigo. Começa com Deus amando e dando o primeiro passo. A fé nasce de uma resposta, não de uma tentativa de merecer.',
    phrases: ['O amor de Deus chega antes da minha resposta.'],
    references: [seedReference('João', 3, 16), seedReference('1 João', 4, 19)],
    tags: ['amor', 'evangelho'],
    color: 'terracotta',
    status: 'finalized',
    published: true,
    favorite: true,
    createdAt: '2025-02-11T08:25:00.000Z',
    updatedAt: '2025-02-11T08:25:00.000Z',
    linkedAnnotationIds: ['seed-2'],
  },
  {
    id: 'seed-2',
    authorName: 'Rafael Mendes',
    authorInitial: 'R',
    title: 'A palavra que me encontra agora',
    mainPoint: 'A palavra agora traz o texto para o presente. Em Cristo, a culpa não é mais o lugar de onde tomo decisões.',
    phrases: ['A graça não é um endereço para visitar; é o chão de hoje.'],
    references: [seedReference('Romanos', 8, 1), seedReference('Romanos', 8, 38, 39)],
    tags: ['graça', 'identidade'],
    color: 'sage',
    status: 'finalized',
    published: true,
    favorite: false,
    createdAt: '2025-02-09T07:40:00.000Z',
    updatedAt: '2025-02-10T06:18:00.000Z',
    linkedAnnotationIds: ['seed-1'],
  },
  {
    id: 'seed-3',
    authorName: 'Lívia Nascimento',
    authorInitial: 'L',
    title: 'Quando o caminho fica escuro',
    mainPoint: 'O salmo não promete ausência de vales. Promete presença. Talvez coragem seja continuar andando com uma companhia que já conheço.',
    phrases: ['A presença é a promessa dentro do vale.'],
    references: [seedReference('Salmos', 23, 4), seedReference('Isaías', 43, 2)],
    tags: ['oração', 'presença'],
    color: 'gold',
    status: 'finalized',
    published: true,
    favorite: true,
    createdAt: '2025-02-04T06:55:00.000Z',
    updatedAt: '2025-02-04T06:55:00.000Z',
    linkedAnnotationIds: [],
  },
  {
    id: 'seed-draft',
    authorName: 'Meu caderno',
    authorInitial: 'M',
    title: 'Uma pergunta para carregar',
    mainPoint: 'Comecei a perceber como a mansidão de Jesus não é passividade, mas uma força que não precisa se provar.',
    phrases: ['Voltar a este trecho antes de responder.'],
    references: [seedReference('Mateus', 5, 5)],
    tags: ['em andamento'],
    color: 'plum',
    status: 'draft',
    published: false,
    favorite: false,
    createdAt: '2025-02-13T09:10:00.000Z',
    updatedAt: '2025-02-13T09:10:00.000Z',
    linkedAnnotationIds: [],
  },
];

const seededSaved: SavedPassage[] = [
  { id: 'saved-1', reference: seedReference('Salmos', 23, 1), title: 'Uma manhã tranquila', excerpt: 'O Senhor é o meu pastor; nada me faltará.', color: 'sage' },
  { id: 'saved-2', reference: seedReference('Filipenses', 4, 6), title: 'Para dias inquietos', excerpt: 'Não andeis ansiosos por coisa alguma...', color: 'gold' },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeReference(value: Partial<BibleReference> & { label?: string }, index: number): BibleReference {
  const book = value.book ?? 'João';
  const chapter = Number(value.chapter ?? 3);
  const verseStart = Number(value.verseStart ?? 1);
  const verseEnd = value.verseEnd ? Number(value.verseEnd) : undefined;
  return { id: value.id ?? `migrated-ref-${index}-${book}-${chapter}-${verseStart}`, book, chapter, verseStart, verseEnd, label: value.label ?? `${book} ${chapter}:${verseStart}${verseEnd ? `-${verseEnd}` : ''}` };
}

function migrateAnnotations(): Annotation[] {
  const current = readStorage<unknown>(STORAGE.annotations, null);
  const source = Array.isArray(current) ? current : readStorage<unknown>(STORAGE.legacyNotes, null);
  if (!Array.isArray(source)) return seededAnnotations;
  return source.map((item, index) => {
    const raw = item as Partial<Annotation> & { content?: string; reference?: BibleReference; linkedReferenceIds?: string[] };
    const references = Array.isArray(raw.references) && raw.references.length
      ? raw.references.map((ref, refIndex) => normalizeReference(ref, index * 10 + refIndex))
      : raw.reference
        ? [normalizeReference(raw.reference, index)]
        : [normalizeReference({}, index)];
    const status: AnnotationStatus = raw.status === 'finalized' ? 'finalized' : 'draft';
    return {
      id: raw.id ?? `migrated-${index}`,
      authorName: raw.authorName ?? 'Meu caderno',
      authorInitial: raw.authorInitial ?? (raw.authorName?.slice(0, 1).toUpperCase() || 'M'),
      title: raw.title ?? 'Anotação sem título',
      mainPoint: raw.mainPoint ?? raw.content ?? '',
      phrases: Array.isArray(raw.phrases) ? raw.phrases.filter(Boolean) : [],
      references,
      tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
      color: raw.color && ['navy', 'terracotta', 'sage', 'gold', 'plum'].includes(raw.color) ? raw.color : 'terracotta',
      status,
      published: typeof raw.published === 'boolean' ? raw.published : Boolean(raw.content),
      favorite: Boolean(raw.favorite),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
      linkedAnnotationIds: Array.isArray(raw.linkedAnnotationIds) ? raw.linkedAnnotationIds : raw.linkedReferenceIds ?? [],
    };
  });
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(date)).replace('.', '');
}

function viewForPath(path: string): View {
  if (path === '/caderno') return 'overview';
  if (path === '/mural') return 'feed';
  if (path === '/anotacoes') return 'notes';
  if (path === '/aprender' || path === '/learn') return 'learn';
  if (path === '/escritores' || path === '/perfis') return 'profiles';
  if (path === '/leitor') return 'reader';
  if (path === '/preferencias') return 'preferences';
  return 'overview';
}

function pathForView(view: View) {
  if (view === 'overview') return '/caderno';
  if (view === 'feed') return '/mural';
  if (view === 'notes') return '/anotacoes';
  if (view === 'learn') return '/aprender';
  if (view === 'profiles') return '/escritores';
  if (view === 'reader') return '/leitor';
  if (view === 'preferences') return '/preferencias';
  return '/caderno';
}

function CadernoLogo() {
  return (
    <span className="cb-logo" role="img" aria-label="Caderno Bíblico">
      <span className="cb-letter-c">C</span>
      <span className="cb-letter-b">B</span>
    </span>
  );
}

function PublicWelcome() {
  const [, setLocation] = useLocation();
  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      setLocation('/caderno');
    } catch (e) {
      console.error('Erro no login com Google:', e);
    }
  };

  return (
    <main className="auth-landing">
      <div className="auth-landing-orbit orbit-one" />
      <div className="auth-landing-orbit orbit-two" />
      <section className="auth-landing-card">
        <div className="auth-brand-mark"><CadernoLogo /></div>
        <div className="eyebrow">um espaço para voltar</div>
        <h1 className="auth-landing-title">Caderno<br /><em>Bíblico</em></h1>
        <p className="auth-landing-copy">Leia sem pressa, marque o que falou com você e guarde suas descobertas em um só lugar.</p>
        <div className="auth-landing-actions">
          <button type="button" className="primary-button auth-cta" onClick={handleGoogleAuth} data-testid="button-google-login">
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 4 }}>
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Entrar com o Google <ArrowRight size={15} />
          </button>
          <button type="button" className="outline-button auth-cta-secondary" onClick={() => setLocation('/caderno')} data-testid="button-create-account">Explorar caderno</button>
        </div>
        <div className="auth-landing-promise"><BookOpen size={14} /> Seus estudos, suas cores, seu ritmo.</div>
      </section>
    </main>
  );
}

function SignInPage() {
  const [, setLocation] = useLocation();
  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      setLocation('/caderno');
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <main className="auth-page">
      <button type="button" className="auth-back-button" onClick={() => setLocation('/')}><ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Voltar</button>
      <div className="auth-page-intro">
        <div className="auth-brand-mark small"><CadernoLogo /></div>
        <span>Caderno Bíblico</span>
      </div>
      <div className="auth-widget" style={{ textAlign: 'center', padding: '32px 24px', background: '#fbf8f1', borderRadius: '1rem', border: '1px solid #d8d0c2' }}>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.4rem', color: '#253044', marginBottom: '8px' }}>Volte ao seu caderno</h2>
        <p style={{ color: '#667085', fontSize: '0.9rem', marginBottom: '24px' }}>Conecte sua conta Google para sincronizar e compartilhar suas reflexões no mural.</p>
        <button type="button" className="primary-button" onClick={handleGoogle} style={{ width: '100%', justifyContent: 'center', gap: '10px', padding: '12px 18px', fontSize: '0.95rem' }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Entrar com a conta Google
        </button>
      </div>
    </main>
  );
}

function SignUpPage() {
  return <SignInPage />;
}

function HomeRedirect() {
  return <PublicWelcome />;
}

function ProtectedApp() {
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [location, setLocation] = useLocation();
  return <AppShell view={viewForPath(location)} onNavigate={(view) => setLocation(pathForView(view))} />;
}

function AccountMenu({ currentUser, onOpenProfile }: { currentUser: FirebaseUser | null; onOpenProfile?: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void }) {
  if (currentUser) {
    const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'Meu caderno';
    const initial = name.slice(0, 1).toUpperCase();
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button 
          type="button" 
          onClick={() => onOpenProfile?.({ authorId: currentUser.uid, authorName: name, authorPhoto: currentUser.photoURL || undefined })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}
          className="account-summary"
          title="Ver meu perfil"
        >
          {currentUser.photoURL ? (
            <img src={currentUser.photoURL} alt={name} style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span className="account-avatar">{initial}</span>
          )}
          <span className="account-name">{name}</span>
        </button>
        <button 
          type="button" 
          className="account-signout-icon" 
          onClick={() => logoutFirebase()}
          title="Sair da conta"
          aria-label="Sair da conta"
        >
          <LogOut size={16} />
        </button>
      </div>
    );
  }

  return (
    <button 
      type="button" 
      className="outline-button" 
      onClick={() => signInWithGoogle()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.85rem' }}
    >
      <svg width="15" height="15" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
      </svg>
      Entrar com Google
    </button>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  if (!isClerkConfigured || !clerkPubKey) {
    return (
      <TooltipProvider>
        <Switch>
          <Route path="/" component={AuthenticatedApp} />
          <Route path="/caderno" component={AuthenticatedApp} />
          <Route path="/mural" component={AuthenticatedApp} />
          <Route path="/anotacoes" component={AuthenticatedApp} />
          <Route path="/escritores" component={AuthenticatedApp} />
          <Route path="/perfis" component={AuthenticatedApp} />
          <Route path="/leitor" component={AuthenticatedApp} />
          <Route path="/preferencias" component={AuthenticatedApp} />
          <Route component={AuthenticatedApp} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Volte ao seu caderno', subtitle: 'Entre para continuar suas leituras e anotações' } },
        signUp: { start: { title: 'Crie seu caderno', subtitle: 'Comece uma jornada de leitura com mais presença' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <TooltipProvider>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/caderno" component={ProtectedApp} />
          <Route path="/mural" component={ProtectedApp} />
          <Route path="/anotacoes" component={ProtectedApp} />
          <Route path="/escritores" component={ProtectedApp} />
          <Route path="/perfis" component={ProtectedApp} />
          <Route path="/leitor" component={ProtectedApp} />
          <Route path="/preferencias" component={ProtectedApp} />
          <Route component={ProtectedApp} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

function AppShell({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>(migrateAnnotations);
  const [saved, setSaved] = useState<SavedPassage[]>(() => readStorage(STORAGE.saved, seededSaved));
  const [preferences, setPreferences] = useState<Preferences>(() => ({ ...defaultPreferences, ...readStorage<Partial<Preferences>>(STORAGE.preferences, {}) }));
  const [composer, setComposer] = useState<{ annotation?: Annotation; initialReference?: BibleReference }>();
  const [confirmDelete, setConfirmDelete] = useState<Annotation | null>(null);
  const [toast, setToast] = useState('');
  
  // Notifications State & Popover
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Profile view & Verse preview popover state
  const [activeProfile, setActiveProfile] = useState<{ authorId: string; authorName: string; authorPhoto?: string } | null>(null);
  const [activeVersePreview, setActiveVersePreview] = useState<BibleReference | null>(null);
  const [investigationAnnotation, setInvestigationAnnotation] = useState<Annotation | null>(null);

  useEffect(() => {
    const handleCustomProfileOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ authorId: string; authorName: string; authorPhoto?: string }>;
      if (customEvent.detail) {
        setActiveProfile(customEvent.detail);
      }
    };
    window.addEventListener('open_profile', handleCustomProfileOpen);
    return () => window.removeEventListener('open_profile', handleCustomProfileOpen);
  }, []);

  // Followed users state (Twitter style)
  const [followedUsers, setFollowedUsers] = useState<string[]>(() => {
    const key = `followed_users_${currentUser?.uid || 'guest'}`;
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  });

  useEffect(() => {
    const key = `followed_users_${currentUser?.uid || 'guest'}`;
    window.localStorage.setItem(key, JSON.stringify(followedUsers));
  }, [followedUsers, currentUser]);

  const pushRealNotification = (
    recipientId: string,
    type: AppNotification['type'],
    title: string,
    message: string,
    authorName?: string,
    authorPhoto?: string,
    annotationId?: string
  ) => {
    const notif: AppNotification = {
      id: makeId('notif'),
      recipientId,
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      authorName: authorName || currentUser?.displayName || 'Um leitor',
      authorPhoto: authorPhoto || currentUser?.photoURL || undefined,
      annotationId,
    };
    try {
      safeSetDoc(doc(db, 'notifications', notif.id), notif);
    } catch (e) {}
    setNotifications((prev) => [notif, ...prev.filter(n => n.id !== notif.id)]);
  };

  const handleToggleFollow = (authorId: string, authorName: string) => {
    if (followedUsers.includes(authorId)) {
      setFollowedUsers((prev) => prev.filter((id) => id !== authorId));
      showToast(`Você deixou de seguir ${authorName}.`);
    } else {
      setFollowedUsers((prev) => [...prev, authorId]);
      showToast(`Você agora está seguindo ${authorName}!`);
      pushRealNotification(authorId, 'follow', 'Novo seguidor', `${currentUser?.displayName || 'Um leitor'} começou a seguir você`, currentUser?.displayName || 'Um leitor', currentUser?.photoURL || undefined);
    }
  };

  // Check for unfinished drafts and notify user automatically
  useEffect(() => {
    const draftsCount = annotations.filter(a => a.status === 'draft').length;
    if (draftsCount > 0) {
      setNotifications(prev => {
        if (prev.some(n => n.type === 'unfinished')) return prev;
        return [
          {
            id: 'notif-draft-warning',
            type: 'unfinished',
            title: 'Bloco não finalizado',
            message: `Você tem ${draftsCount} ${draftsCount === 1 ? 'bloco de notas em andamento (rascunho)' : 'blocos de notas em andamento (rascunhos)'}. Que tal finalizar hoje?`,
            createdAt: new Date().toISOString(),
            read: false
          },
          ...prev
        ];
      });
    }
  }, [annotations]);

  // Synchronize Firestore notifications in real-time
  useEffect(() => {
    if (!currentUser) return;
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'notifications'), 
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteNotifs: AppNotification[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as AppNotification;
              if (data.recipientId === currentUser.uid || data.recipientId === 'guest' || !data.recipientId) {
                remoteNotifs.push(data);
              }
            });
            remoteNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotifications(remoteNotifs);
          }
        },
        (err) => {
          console.warn('Firestore notifications sync status:', err.message);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore notifications listener setup status:', e);
    }
  }, [currentUser]);

  // Listen for Google Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Synchronize Firestore annotations in real-time
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'annotations'), 
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteAnnotations: Annotation[] = [];
            snapshot.forEach((docSnap) => {
              remoteAnnotations.push(docSnap.data() as Annotation);
            });
            setAnnotations(remoteAnnotations);
          }
        }, 
        (err) => {
          console.warn('Firestore annotations sync status:', err.message);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore listener setup error:', err);
    }
  }, []);

  // Synchronize Firestore saved passages in real-time
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'saved_passages'), 
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteSaved: SavedPassage[] = [];
            snapshot.forEach((docSnap) => {
              remoteSaved.push(docSnap.data() as SavedPassage);
            });
            setSaved(remoteSaved);
          }
        }, 
        (err) => {
          console.warn('Firestore saved passages sync status:', err.message);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore saved listener setup error:', err);
    }
  }, []);

  // Shared notes state & Firestore synchronization
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>(() => {
    try {
      const raw = window.localStorage.getItem('cb_shared_notes');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'shared_notes'),
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteShared: SharedNote[] = [];
            snapshot.forEach((docSnap) => {
              remoteShared.push(docSnap.data() as SharedNote);
            });
            setSharedNotes(remoteShared);
          }
        },
        (err) => {
          console.warn('Firestore shared_notes sync status:', err.message);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore shared_notes listener error:', err);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('cb_shared_notes', JSON.stringify(sharedNotes));
    } catch (e) {}
  }, [sharedNotes]);

  useEffect(() => {
    try {
      const clean = sanitizeForFirestore(annotations);
      window.localStorage.setItem(STORAGE.annotations, JSON.stringify(clean));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }, [annotations]);
  useEffect(() => { window.localStorage.setItem(STORAGE.saved, JSON.stringify(saved)); }, [saved]);
  useEffect(() => {
    window.localStorage.setItem(STORAGE.preferences, JSON.stringify(preferences));
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
    document.documentElement.lang = preferences.language;

    const sizeClass = `font-scale-${preferences.systemFontSize || 'medium'}`;
    document.documentElement.classList.remove('font-scale-small', 'font-scale-medium', 'font-scale-large', 'font-scale-xlarge');
    document.documentElement.classList.add(sizeClass);
  }, [preferences]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Click outside to close mobile hamburger menu automatically
  useEffect(() => {
    if (!mobileNav) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mobile-menu-wrap')) {
        setMobileNav(false);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [mobileNav]);

  // Separate private notes for current account vs public notes for feed (Twitter style)
  const currentUid = currentUser?.uid || 'guest';
  const myAnnotations = useMemo(() => {
    return annotations.filter((a) => (a.authorId ? a.authorId === currentUid : currentUid === 'guest'));
  }, [annotations, currentUid]);

  const publicFeedAnnotations = useMemo(() => {
    return annotations.filter((a) => a.published);
  }, [annotations]);

  const allTags = useMemo(() => Array.from(new Set(annotations.flatMap((annotation) => annotation.tags))).sort(), [annotations]);
  const updatePreferences = (patch: Partial<Preferences>) => setPreferences((current) => ({ ...current, ...patch }));
  const showToast = (message: string) => setToast(message);
  const openComposer = (initialReference?: BibleReference) => setComposer({ initialReference });
  const editComposer = (annotation: Annotation) => setComposer({ annotation });

  const persistAnnotation = (draft: AnnotationDraft, editingId?: string, reason = 'save'): string => {
    const now = new Date().toISOString();
    const authorId = currentUser?.uid ?? 'guest';
    const authorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || draft.authorName || 'Meu caderno';
    const authorInitial = (authorName.slice(0, 1) || 'M').toUpperCase();
    const authorPhoto = currentUser?.photoURL || undefined;

    let targetId = editingId;
    let updatedItem: Annotation;

    if (targetId) {
      const existing = annotations.find(a => a.id === targetId);
      updatedItem = { ...existing, ...draft, authorId, authorName, authorInitial, authorPhoto, id: targetId, updatedAt: now } as Annotation;
      setAnnotations((current) => current.map((annotation) => annotation.id === targetId ? updatedItem : annotation));
    } else {
      targetId = makeId('annotation');
      updatedItem = { ...draft, authorId, authorName, authorInitial, authorPhoto, id: targetId, createdAt: now, updatedAt: now };
      setAnnotations((current) => [updatedItem, ...current]);
    }
    
    // Save to Firestore using safeSetDoc to prevent undefined property errors
    try {
      safeSetDoc(doc(db, 'annotations', updatedItem.id), updatedItem);
    } catch (e) {
      console.error('Firestore save failed:', e);
    }

    if (reason !== 'autosave') {
      setComposer(undefined);
      showToast(reason === 'finalized' ? 'Anotação marcada como finalizada.' : reason === 'published' ? 'Reflexão salva e sincronizada no Firestore.' : reason === 'close' ? 'Rascunho guardado. Você pode retomar quando quiser.' : editingId ? 'Anotação atualizada.' : 'Rascunho guardado no caderno.');
    }

    return targetId;
  };

  const handleLike = (id: string) => {
    let updatedItem: Annotation | undefined;
    let wasLiked = false;
    const uid = currentUser?.uid || 'guest';
    setAnnotations((current) => current.map((annotation) => {
      if (annotation.id === id) {
        const likedBy = annotation.likedBy || [];
        const isLiked = likedBy.includes(uid);
        wasLiked = isLiked;
        const nextLikedBy = isLiked ? likedBy.filter(u => u !== uid) : [...likedBy, uid];
        const nextLikesCount = Math.max(0, (annotation.likesCount || 0) + (isLiked ? -1 : 1));
        updatedItem = { ...annotation, likesCount: nextLikesCount, likedBy: nextLikedBy, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return annotation;
    }));
    if (updatedItem) {
      safeSetDoc(doc(db, 'annotations', id), updatedItem).catch(e => console.error(e));
      if (!wasLiked) {
        addNotification('like', 'Curtida enviada', `Você curtiu "${updatedItem.title}"`);
      }
    }
  };

  const handleAddComment = (id: string, text: string) => {
    if (!text.trim()) return;
    let updatedItem: Annotation | undefined;
    const comment: Comment = {
      id: makeId('comment'),
      authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Leitor',
      authorPhoto: currentUser?.photoURL || undefined,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    setAnnotations((current) => current.map((annotation) => {
      if (annotation.id === id) {
        const comments = annotation.comments || [];
        updatedItem = { ...annotation, comments: [...comments, comment], updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return annotation;
    }));
    if (updatedItem) {
      safeSetDoc(doc(db, 'annotations', id), updatedItem).catch(e => console.error(e));
      showToast('Comentário enviado!');
      addNotification('comment', 'Novo comentário', `Comentário adicionado em "${updatedItem.title}"`);
    }
  };

  const handleRepost = (annotation: Annotation) => {
    const nextCount = (annotation.repostsCount || 0) + 1;
    const updated = { ...annotation, repostsCount: nextCount, updatedAt: new Date().toISOString() };
    setAnnotations((current) => current.map(a => a.id === annotation.id ? updated : a));
    safeSetDoc(doc(db, 'annotations', annotation.id), updated).catch(e => console.error(e));

    const repostedCopy: Annotation = {
      ...annotation,
      id: makeId('repost'),
      authorId: currentUser?.uid ?? 'guest',
      authorName: currentUser?.displayName || 'Meu caderno',
      authorInitial: (currentUser?.displayName || 'M')[0].toUpperCase(),
      authorPhoto: currentUser?.photoURL || undefined,
      title: `[Repost de @${annotation.authorName}] ${annotation.title}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      published: false
    };
    setAnnotations(current => [repostedCopy, ...current]);
    safeSetDoc(doc(db, 'annotations', repostedCopy.id), repostedCopy).catch(e => console.error(e));
    showToast('Reflexão recompartilhada no seu caderno!');
    addNotification('repost', 'Bloco recompartilhado', `Você recompartilhou o bloco de @${annotation.authorName}`);
  };

  const toggleFavorite = (id: string) => {
    let updatedItem: Annotation | undefined;
    setAnnotations((current) => current.map((annotation) => {
      if (annotation.id === id) {
        updatedItem = { ...annotation, favorite: !annotation.favorite, updatedAt: new Date().toISOString() };
        return updatedItem;
      }
      return annotation;
    }));
    if (updatedItem) {
      safeSetDoc(doc(db, 'annotations', id), updatedItem).catch(e => console.error(e));
    }
    showToast('Favorito atualizado.');
  };

  const removeAnnotation = () => {
    if (!confirmDelete) return;
    const targetId = confirmDelete.id;
    setAnnotations((current) => current.filter((annotation) => annotation.id !== targetId).map((annotation) => ({ ...annotation, linkedAnnotationIds: annotation.linkedAnnotationIds.filter((id) => id !== targetId) })));
    
    // Delete from Firestore
    try {
      deleteDoc(doc(db, 'annotations', targetId));
    } catch (e) {
      console.error('Firestore delete failed:', e);
    }

    setConfirmDelete(null);
    showToast('Anotação removida.');
  };

  const openReference = (reference: BibleReference) => {
    updatePreferences({ selectedBook: reference.book, selectedChapter: reference.chapter });
    onNavigate('reader');
  };

  const handleToggleSavedPassage = (passage: SavedPassage) => {
    const isSaved = saved.some((item) => item.reference.label === passage.reference.label);
    if (isSaved) {
      setSaved((current) => current.filter((item) => item.reference.label !== passage.reference.label));
      try {
        deleteDoc(doc(db, 'saved_passages', passage.id));
      } catch (e) {}
      showToast('Leitura retirada das guardadas.');
    } else {
      setSaved((current) => [passage, ...current]);
      try {
        setDoc(doc(db, 'saved_passages', passage.id), passage);
      } catch (e) {}
      showToast('Passagem guardada no Firestore.');
    }
  };

  const handleSelectNotification = (notif: AppNotification) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    setShowNotifications(false);

    if (notif.type === 'unfinished') {
      const draft = myAnnotations.find((a) => a.status === 'draft');
      if (draft) {
        editComposer(draft);
      } else {
        onNavigate('notes');
      }
    } else if (notif.annotationId) {
      const targetNote = annotations.find((a) => a.id === notif.annotationId);
      if (targetNote) {
        if (targetNote.authorId === (currentUser?.uid || 'guest')) {
          editComposer(targetNote);
        } else {
          onNavigate('feed');
        }
      }
    } else if (notif.authorName) {
      const targetAuthor = annotations.find((a) => a.authorName === notif.authorName || (notif.recipientId && a.authorId === notif.recipientId));
      if (targetAuthor) {
        setActiveProfile({
          authorId: targetAuthor.authorId || targetAuthor.authorName,
          authorName: targetAuthor.authorName,
          authorPhoto: targetAuthor.authorPhoto,
        });
      } else {
        setActiveProfile({
          authorId: notif.recipientId || 'guest',
          authorName: notif.authorName,
          authorPhoto: notif.authorPhoto,
        });
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const isBottomNav = (preferences.navigationMode || 'top') === 'bottom';
  const [isNavVisible, setIsNavVisible] = useState(true);
  const navTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [sendNoteTarget, setSendNoteTarget] = useState<Annotation | null>(null);
  const [closedWithoutChoiceIds, setClosedWithoutChoiceIds] = useState<string[]>([]);
  const [showDraftsMenu, setShowDraftsMenu] = useState(false);

  // Active unfinished draft notes where modal was closed without explicit choice
  const closedWithoutChoiceDrafts = useMemo(() => {
    return myAnnotations.filter((a) => a.status === 'draft' && closedWithoutChoiceIds.includes(a.id));
  }, [myAnnotations, closedWithoutChoiceIds]);

  const handleSendNote = (annotation: Annotation, recipientId: string, recipientName: string) => {
    const shared: SharedNote = {
      id: makeId('shared'),
      originalNoteId: annotation.id,
      senderId: currentUser?.uid || 'guest',
      senderName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Meu caderno',
      senderPhoto: currentUser?.photoURL || undefined,
      recipientId,
      recipientName,
      title: annotation.title,
      mainPoint: annotation.mainPoint,
      phrases: annotation.phrases,
      references: annotation.references,
      tags: annotation.tags,
      color: annotation.color,
      createdAt: new Date().toISOString()
    };

    setSharedNotes((prev) => [shared, ...prev]);
    safeSetDoc(doc(db, 'shared_notes', shared.id), shared).catch((e) => console.error(e));
    pushRealNotification(
      recipientId,
      'send',
      'Nota recebida',
      `@${shared.senderName} enviou uma anotação para você: "${annotation.title}"`,
      shared.senderName,
      shared.senderPhoto,
      annotation.id
    );
    showToast(`Anotação enviada para @${recipientName}!`);
    setSendNoteTarget(null);
  };

  const handleAdoptSharedNote = (shared: SharedNote) => {
    const draft: AnnotationDraft = {
      authorName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Meu caderno',
      authorInitial: (currentUser?.displayName || 'M')[0].toUpperCase(),
      authorPhoto: currentUser?.photoURL || undefined,
      title: `[Cópia de @${shared.senderName}] ${shared.title}`,
      mainPoint: shared.mainPoint,
      phrases: shared.phrases,
      references: shared.references,
      tags: [...shared.tags, 'compartilhado'],
      color: shared.color,
      status: 'draft',
      published: false,
      favorite: false,
      linkedAnnotationIds: []
    };

    const targetId = persistAnnotation(draft, undefined, 'save');
    showToast('Cópia adicionada ao seu caderno! Você já pode editá-la.');
    if (targetId) {
      const created = annotations.find((a) => a.id === targetId) || { ...draft, id: targetId, authorId: currentUser?.uid || 'guest', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      editComposer(created as Annotation);
    }
  };

  const resetNavTimer = useCallback(() => {
    setIsNavVisible(true);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => {
      setIsNavVisible(false);
    }, 4000);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const isEditingText = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || active.isContentEditable || active.closest('.editor') !== null;
    };

    const handleScroll = () => {
      if (isEditingText() || composer) return;

      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY;
      if (diff > 15 && currentScrollY > 50) {
        setIsNavVisible(false);
        if (navTimerRef.current) clearTimeout(navTimerRef.current);
      } else if (diff < -8 || currentScrollY < 30) {
        resetNavTimer();
      }
      lastScrollY = currentScrollY;
    };

    const handleInteraction = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (isEditingText() || target?.closest('.composer-sheet, .modal, .notifications-popover')) return;
      resetNavTimer();
    };

    resetNavTimer();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointerdown', handleInteraction);
    };
  }, [composer, resetNavTimer]);

  if (!currentUser) {
    return <PublicWelcome />;
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onNavigate={onNavigate} annotationsCount={myAnnotations.length} tags={allTags} currentUser={currentUser} language={preferences.language} />
      <main className="main-area has-bottom-nav">
        <header className="topbar">
          <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div className="brand-mark" onClick={() => onNavigate('overview')} title={t('nav.overview', preferences.language)}>
              <CadernoLogo />
            </div>
            <span 
              className="brand-word-title" 
              onClick={() => onNavigate('overview')} 
              style={{ fontFamily: 'var(--app-font-serif)', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.03em', color: 'hsl(var(--foreground))' }}
            >
              {t('app.title', preferences.language)}
            </span>
          </div>

          <div className="top-actions">
            <div className="top-corner-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Notification Bell Button & Popover at top */}
              <div style={{ position: 'relative' }}>
                <button 
                  type="button" 
                  className={`icon-button notification-bell-btn ${showNotifications ? 'active' : ''}`} 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  aria-label="Notificações" 
                  title="Notificações"
                  data-testid="button-open-notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="notification-badge-dot">{unreadCount}</span>
                  )}
                </button>
                {showNotifications && (
                  <NotificationsPopover 
                    notifications={notifications} 
                    onClose={() => setShowNotifications(false)} 
                    onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                    onSelectNotification={handleSelectNotification}
                  />
                )}
              </div>

              {/* Botão de Configurações no Topo */}
              <button 
                type="button" 
                className="icon-button" 
                onClick={() => onNavigate('preferences')} 
                aria-label="Abrir preferências" 
                title="Configurações"
                data-testid="button-open-settings"
              >
                <Settings size={18} />
              </button>

              {/* Botão de Sair no Topo */}
              <button 
                type="button" 
                className="icon-button danger-button" 
                onClick={() => {
                  if (window.confirm('Deseja realmente sair da sua conta?')) {
                    logoutFirebase();
                  }
                }} 
                aria-label="Sair da conta" 
                title="Sair da conta"
                data-testid="button-top-logout"
              >
                <LogOut size={18} />
              </button>
            </div>

            <button
              type="button"
              className="icon-button desktop-header-control"
              onClick={() => {
                const map: Record<string, SystemFontSize> = {
                  small: 'medium',
                  medium: 'large',
                  large: 'xlarge',
                  xlarge: 'small',
                };
                const next = map[preferences.systemFontSize || 'medium'];
                updatePreferences({ systemFontSize: next });
                const labels: Record<string, string> = {
                  small: 'Menor',
                  medium: 'Padrão',
                  large: 'Maior',
                  xlarge: 'Muito Maior',
                };
                showToast(`Letra do sistema: ${labels[next]}`);
              }}
              aria-label="Ajustar tamanho da fonte do sistema"
              title={`Tamanho da fonte do sistema: ${preferences.systemFontSize || 'medium'}`}
              data-testid="button-quick-font-size"
            >
              <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--app-font-serif)' }}>A+</span>
            </button>
            <div className="desktop-account"><AccountMenu currentUser={currentUser} onOpenProfile={setActiveProfile} /></div>
          </div>
        </header>
        <div className="below-header-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="below-header-bible" onClick={() => onNavigate('reader')} data-testid="button-header-bible"><BookOpen size={14} /> {t('nav.reader', preferences.language)}</button>
          <button type="button" className="primary-button" onClick={() => openComposer()} data-testid="button-quick-add"><Plus size={15} /> {t('nav.new_note', preferences.language)}</button>
        </div>
        {view === 'overview' && <Overview annotations={myAnnotations} saved={saved} onNavigate={onNavigate} onOpen={openComposer} onEdit={editComposer} onDelete={setConfirmDelete} onFavorite={toggleFavorite} onReference={openReference} onLike={handleLike} onAddComment={handleAddComment} onRepost={handleRepost} currentUser={currentUser} onOpenProfile={setActiveProfile} onSelectReferencePreview={setActiveVersePreview} followedUsers={followedUsers} onToggleFollow={handleToggleFollow} onSendNote={(a) => setSendNoteTarget(a)} language={preferences.language} onOpenInvestigation={setInvestigationAnnotation} />}
        {view === 'learn' && (
          <BibleLearningView
            language={preferences.language}
            onOpenReader={(book, chapter) => {
              updatePreferences({ selectedBook: book, selectedChapter: chapter });
              onNavigate('reader');
            }}
          />
        )}
        {view === 'feed' && <Feed annotations={publicFeedAnnotations} tags={allTags} onOpen={openComposer} onEdit={editComposer} onDelete={setConfirmDelete} onFavorite={toggleFavorite} onReference={openReference} onLike={handleLike} onAddComment={handleAddComment} onRepost={handleRepost} currentUser={currentUser} onOpenProfile={setActiveProfile} onSelectReferencePreview={setActiveVersePreview} followedUsers={followedUsers} onToggleFollow={handleToggleFollow} onSendNote={(a) => setSendNoteTarget(a)} language={preferences.language} onOpenInvestigation={setInvestigationAnnotation} />}
        {view === 'notes' && <MyAnnotations annotations={myAnnotations} tags={allTags} onOpen={openComposer} onEdit={editComposer} onDelete={setConfirmDelete} onFavorite={toggleFavorite} onReference={openReference} onLike={handleLike} onAddComment={handleAddComment} onRepost={handleRepost} currentUser={currentUser} onOpenProfile={setActiveProfile} onSelectReferencePreview={setActiveVersePreview} followedUsers={followedUsers} onToggleFollow={handleToggleFollow} onSendNote={(a) => setSendNoteTarget(a)} language={preferences.language} onOpenInvestigation={setInvestigationAnnotation} />}
        {view === 'profiles' && <ProfilesView annotations={annotations} currentUser={currentUser} followedUsers={followedUsers} onToggleFollow={handleToggleFollow} onOpenProfile={setActiveProfile} />}
        {view === 'reader' && <BibleReader books={books} preferences={preferences} annotations={myAnnotations} saved={saved} onPreferences={updatePreferences} onOpen={openComposer} onSavePassage={handleToggleSavedPassage} />}
        {view === 'preferences' && <PreferencesView preferences={preferences} onPreferences={updatePreferences} annotations={myAnnotations} saved={saved} onClear={() => { if (window.confirm('Apagar as anotações e passagens deste dispositivo?')) { setAnnotations([]); setSaved([]); showToast('Dados locais apagados.'); } }} />}
      </main>

      {/* Small floating trigger button when bottom nav auto-hides */}
      {!isNavVisible && !composer && !activeProfile && !confirmDelete && !activeVersePreview && (
        <button
          type="button"
          className="floating-nav-trigger"
          onClick={() => resetNavTimer()}
          title="Abrir navegação"
          aria-label="Abrir navegação"
          data-testid="button-floating-nav-trigger"
        >
          <Grid size={18} />
        </button>
      )}

      {/* Inspirational Floating Active Study Badge */}
      {closedWithoutChoiceDrafts.length > 0 && !composer && !activeProfile && !confirmDelete && !activeVersePreview && (
        <div style={{ position: 'fixed', right: 18, bottom: 80, zIndex: 970 }}>
          <button
            type="button"
            className="floating-draft-badge"
            onClick={() => {
              if (closedWithoutChoiceDrafts.length === 1) {
                editComposer(closedWithoutChoiceDrafts[0]);
              } else {
                setShowDraftsMenu(!showDraftsMenu);
              }
            }}
            title={closedWithoutChoiceDrafts.length === 1 ? `Continuar estudo: "${closedWithoutChoiceDrafts[0].title || 'Bloco sem título'}"` : `${closedWithoutChoiceDrafts.length} estudos em andamento`}
            data-testid="button-floating-draft-badge"
          >
            <div className="study-badge-circle-icon">
              <BookOpen size={15} />
            </div>
            <div className="floating-draft-info">
              <span className="floating-draft-label">
                {closedWithoutChoiceDrafts.length === 1 ? 'Estudo em andamento' : `${closedWithoutChoiceDrafts.length} estudos em andamento`}
              </span>
              <span className="floating-draft-title">
                {closedWithoutChoiceDrafts.length === 1 
                  ? (closedWithoutChoiceDrafts[0].title || 'Bloco sem título') 
                  : 'Clique para escolher e concluir'}
              </span>
            </div>
            {closedWithoutChoiceDrafts.length > 1 && <ChevronRight size={14} style={{ transform: showDraftsMenu ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />}
          </button>

          {/* Inspirational Menu list if multiple drafts are pending */}
          {showDraftsMenu && closedWithoutChoiceDrafts.length > 1 && (
            <div
              className="paper-card"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                right: 0,
                width: 280,
                padding: 14,
                boxShadow: '0 16px 44px rgba(0,0,0,0.28)',
                borderRadius: 16,
                border: '1px solid hsl(var(--border))',
                zIndex: 980,
                animation: 'rise 0.2s ease both'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11px', fontWeight: 700, color: 'hsl(var(--accent))', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Clock size={13} /> Seus blocos para concluir
              </div>
              <div style={{ display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {closedWithoutChoiceDrafts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className="draft-link"
                    style={{ 
                      textAlign: 'left', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 10, 
                      width: '100%', 
                      padding: '8px 10px', 
                      borderRadius: 10, 
                      background: 'hsl(var(--muted) / 0.4)',
                      border: '1px solid hsl(var(--border) / 0.5)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onClick={() => {
                      setShowDraftsMenu(false);
                      editComposer(d);
                    }}
                  >
                    <div className={`color-choice ${d.color || 'terracotta'}`} style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || 'Bloco sem título'}</div>
                      <div style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))' }}>Clique para retomar e concluir</div>
                    </div>
                    <ChevronRight size={13} color="hsl(var(--muted-foreground))" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!composer && !activeProfile && !confirmDelete && !activeVersePreview && (
        <InstagramBottomNav 
          view={view} 
          onNavigate={onNavigate} 
          onOpenComposer={() => openComposer()} 
          currentUser={currentUser} 
          onOpenProfile={setActiveProfile} 
          isNavVisible={isNavVisible}
          language={preferences.language}
        />
      )}

      {composer && (
        <AnnotationComposer 
          annotation={composer.annotation} 
          initialReference={composer.initialReference} 
          annotations={myAnnotations} 
          currentUser={currentUser}
          onCancel={() => setComposer(undefined)} 
          onPersist={persistAnnotation}
          onChoiceMade={(id) => {
            setClosedWithoutChoiceIds(prev => prev.filter(x => x !== id));
          }}
          onClosedWithoutChoice={(id) => {
            setClosedWithoutChoiceIds(prev => Array.from(new Set([...prev, id])));
          }}
        />
      )}
      {confirmDelete && <ConfirmDelete annotation={confirmDelete} onCancel={() => setConfirmDelete(null)} onConfirm={removeAnnotation} />}
      {activeProfile && (
        <UserProfileModal 
          profile={activeProfile} 
          annotations={annotations} 
          sharedNotes={sharedNotes}
          onClose={() => setActiveProfile(null)} 
          onNavigate={onNavigate} 
          onEdit={editComposer} 
          onDelete={setConfirmDelete} 
          onFavorite={toggleFavorite} 
          onReference={openReference} 
          onLike={handleLike} 
          onAddComment={handleAddComment} 
          onRepost={handleRepost}
          onSendNote={(annotation) => setSendNoteTarget(annotation)}
          onAdoptSharedNote={handleAdoptSharedNote}
          currentUser={currentUser} 
          followedUsers={followedUsers} 
          onToggleFollow={handleToggleFollow} 
          onOpenInvestigation={setInvestigationAnnotation}
        />
      )}
      {sendNoteTarget && (
        <SendNoteModal 
          annotation={sendNoteTarget} 
          currentUser={currentUser} 
          followedUsers={followedUsers} 
          annotations={annotations} 
          onClose={() => setSendNoteTarget(null)} 
          onSend={(recipientId, recipientName) => handleSendNote(sendNoteTarget, recipientId, recipientName)} 
        />
      )}
      {investigationAnnotation && (
        <InvestigationBoardModal
          annotation={investigationAnnotation}
          annotations={annotations}
          currentUser={currentUser}
          onClose={() => setInvestigationAnnotation(null)}
          onEdit={(a) => {
            setInvestigationAnnotation(null);
            editComposer(a);
          }}
          onReference={(ref) => {
            setInvestigationAnnotation(null);
            openReference(ref);
          }}
          onSelectAnnotation={(a) => {
            setInvestigationAnnotation(a);
          }}
        />
      )}
      {activeVersePreview && <VersePreviewModal reference={activeVersePreview} onClose={() => setActiveVersePreview(null)} onOpenBible={openReference} />}
      {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
    </div>
  );
}

function Sidebar({ 
  view, 
  onNavigate, 
  annotationsCount, 
  tags, 
  currentUser,
  language = 'pt-BR'
}: { 
  view: View; 
  onNavigate: (view: View) => void; 
  annotationsCount: number; 
  tags: string[]; 
  currentUser: FirebaseUser | null;
  language?: Language;
}) {
  const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Meu caderno';
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <aside className="sidebar">
      <button type="button" className="brand" onClick={() => onNavigate('overview')} data-testid="button-brand-home">
        <div className="brand-mark"><CadernoLogo /></div><div><div className="brand-word">{t('app.title', language)}</div><div className="brand-sub">{t('app.subtitle', language)}</div></div>
      </button>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        <NavItem icon={<Archive size={16} />} label={t('nav.overview', language)} active={view === 'overview'} onClick={() => onNavigate('overview')} testId="nav-overview" />
        <NavItem icon={<Trophy size={16} />} label={t('nav.learn', language)} active={view === 'learn'} onClick={() => onNavigate('learn')} testId="nav-learn" />
        <NavItem icon={<PenLine size={16} />} label={t('nav.feed', language)} active={view === 'feed'} onClick={() => onNavigate('feed')} testId="nav-feed" />
        <NavItem icon={<FileText size={16} />} label={t('nav.notes', language)} count={annotationsCount} active={view === 'notes'} onClick={() => onNavigate('notes')} testId="nav-notes" />
        <NavItem icon={<Users size={16} />} label={t('nav.profiles', language)} active={view === 'profiles'} onClick={() => onNavigate('profiles')} testId="nav-profiles" />
        <NavItem icon={<BookOpen size={16} />} label={t('nav.reader', language)} active={view === 'reader'} onClick={() => onNavigate('reader')} testId="nav-reader" />
      </nav>
      <hr className="sidebar-rule" />
      <div className="sidebar-label">{t('nav.recent_tags', language)}</div>
      <div>{(tags.length ? tags.slice(0, 4) : ['comece por aqui']).map((tag, index) => <button type="button" className="tag-nav" key={tag} onClick={() => onNavigate('notes')} data-testid={`button-sidebar-tag-${tag}`}><span className={`tag-dot ${['', 'sage', 'gold', 'plum'][index]}`} />{tag}</button>)}</div>
      <div className="sidebar-foot">{currentUser?.photoURL ? <img src={currentUser.photoURL} alt={name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : <div className="avatar">{initial}</div>}<div className="foot-copy">{name}<small>{currentUser ? 'Conectado com Google' : 'Modo visitante'}</small></div><button type="button" className="icon-button" style={{ marginLeft: 'auto', color: 'inherit' }} onClick={() => onNavigate('preferences')} aria-label={t('nav.preferences', language)} data-testid="button-sidebar-settings"><Settings size={15} /></button></div>
    </aside>
  );
}

function MobileMenuPanel({ view, onNavigate, currentUser, onOpenProfile, language = 'pt-BR' }: { view: View; onNavigate: (view: View) => void; currentUser: FirebaseUser | null; onOpenProfile?: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void; language?: Language }) {
  return (
    <div className="mobile-menu-panel">
      <div className="mobile-menu-account">
        <AccountMenu currentUser={currentUser} onOpenProfile={onOpenProfile} />
      </div>
      <button type="button" className="mobile-menu-settings" onClick={() => onNavigate('preferences')} data-testid="mobile-menu-settings">
        <Settings size={16} />
        <span>{t('nav.preferences', language)}</span>
      </button>
      <div className="mobile-menu-divider" />
      <MobileNav view={view} onNavigate={onNavigate} language={language} />
    </div>
  );
}

function MobileNav({ view, onNavigate, language = 'pt-BR' }: { view: View; onNavigate: (view: View) => void; language?: Language }) {
  const items: [View, string, ReactNode][] = [
    ['overview', t('nav.overview', language), <Archive size={15} />],
    ['learn', t('nav.learn', language), <Trophy size={15} />],
    ['feed', t('nav.feed', language), <PenLine size={15} />],
    ['notes', t('nav.notes', language), <FileText size={15} />],
    ['profiles', t('nav.profiles', language), <Users size={15} />],
    ['reader', t('nav.reader', language), <BookOpen size={15} />]
  ];
  return <div className="mobile-nav">{items.map(([key, label, icon]) => <button key={key} type="button" className={`nav-link ${view === key ? 'active' : ''}`} onClick={() => onNavigate(key)} data-testid={`mobile-nav-${key}`}>{icon}{label}</button>)}</div>;
}

function NavItem({ icon, label, count, active, onClick, testId }: { icon: ReactNode; label: string; count?: number; active: boolean; onClick: () => void; testId: string }) {
  return <button type="button" className={`nav-link ${active ? 'active' : ''}`} onClick={onClick} data-testid={testId}>{icon}<span>{label}</span>{count !== undefined && <span className="nav-count">{count}</span>}</button>;
}

function Overview({ 
  annotations, 
  saved, 
  onNavigate, 
  onOpen, 
  onEdit, 
  onDelete, 
  onFavorite, 
  onReference,
  onLike,
  onAddComment,
  onRepost,
  currentUser,
  onOpenProfile,
  onSelectReferencePreview,
  followedUsers,
  onToggleFollow,
  onSendNote,
  language = 'pt-BR',
  onOpenInvestigation
}: { 
  annotations: Annotation[]; 
  saved: SavedPassage[]; 
  onNavigate: (view: View) => void; 
  onOpen: () => void; 
  onEdit: (annotation: Annotation) => void; 
  onDelete: (annotation: Annotation) => void; 
  onFavorite: (id: string) => void; 
  onReference: (reference: BibleReference) => void; 
  onLike: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
  onRepost: (annotation: Annotation) => void;
  currentUser: FirebaseUser | null;
  onOpenProfile?: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void;
  onSelectReferencePreview?: (reference: BibleReference) => void;
  followedUsers?: string[];
  onToggleFollow?: (authorId: string, authorName: string) => void;
  onSendNote?: (annotation: Annotation) => void;
  language?: Language;
  onOpenInvestigation?: (annotation: Annotation) => void;
}) {
  const { user } = useAppUser();
  const recent = annotations.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  const drafts = annotations.filter((annotation) => annotation.status === 'draft');
  const published = annotations.filter((annotation) => annotation.published).length;
  const email = currentUser?.email || user?.primaryEmailAddress?.emailAddress || '';
  const greetingName = currentUser?.displayName?.split(' ')[0] || email.split('@')[0] || (language === 'en' ? 'reader' : 'leitor');
  const formattedGreetingName = greetingName.charAt(0).toUpperCase() + greetingName.slice(1);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('overview.greeting_morning', language) : hour < 18 ? t('overview.greeting_afternoon', language) : t('overview.greeting_evening', language);

  return (
    <section className="page">
      <div className="eyebrow">{new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</div>
      <h1 className="page-title">{greeting}, {formattedGreetingName}.</h1>
      <p className="page-intro">{t('overview.intro', language)}</p>
      <div className="overview-hero">
        <div className="paper-card prompt-card">
          <div className="prompt-kicker">{t('overview.today_prompt_title', language)}</div>
          <div className="prompt-text">{t('overview.today_prompt_text', language)}</div>
          <button type="button" className="prompt-action" onClick={onOpen} data-testid="button-prompt-note">
            {t('overview.start_reflection', language)} <ArrowRight size={14} />
          </button>
        </div>
        <div className="paper-card stats-card">
          <div className="stats-heading">
            <h2>{t('overview.your_notebook', language)}</h2>
            <BookOpen className="stats-icon" size={19} />
          </div>
          <div>
            <div className="stats-big">
              <span className="stats-num" data-testid="text-note-count">{annotations.length}</span>
              <span className="stats-caption">{t('overview.notes_count_caption', language)}</span>
            </div>
            <div className="progress-track">
              <div className="progress-value" style={{ width: `${Math.min(100, Math.max(8, annotations.length * 14))}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="stats-caption">{published} {t('overview.published_caption', language)}</span>
              <span className="stats-caption">{drafts.length} {t('overview.in_progress_caption', language)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="section-head">
        <div>
          <h2 className="section-title">{t('overview.recent_notes', language)}</h2>
          <p className="section-meta">{t('overview.recent_notes_sub', language)}</p>
        </div>
        <button type="button" className="text-button" onClick={() => onNavigate('notes')} data-testid="button-see-all-notes">
          {t('overview.see_all', language)} <ArrowRight size={14} />
        </button>
      </div>
      <div className="overview-columns">
        <div>
          {recent.length ? recent.map((annotation) => <AnnotationCard key={annotation.id} annotation={annotation} annotations={annotations} currentUser={currentUser} onEdit={onEdit} onDelete={onDelete} onFavorite={onFavorite} onReference={onReference} onLike={onLike} onAddComment={onAddComment} onRepost={onRepost} onOpenProfile={onOpenProfile} onSelectReferencePreview={onSelectReferencePreview} followedUsers={followedUsers} onToggleFollow={onToggleFollow} onSendNote={onSendNote} onOpenInvestigation={onOpenInvestigation} />) : <EmptyState title={t('overview.empty_title', language)} text={t('overview.empty_desc', language)} action={t('overview.first_note_btn', language)} onAction={onOpen} />}
        </div>
        <div className="side-stack">
          <SavedPanel saved={saved} onNavigate={onNavigate} />
          <div className="paper-card side-panel">
            <h3>{t('overview.continue_where_left', language)}</h3>
            <p className="side-panel-intro">{drafts.length ? t('overview.has_drafts_hint', language) : t('overview.no_drafts_hint', language)}</p>
            {drafts.slice(0, 2).map((draft) => <button type="button" className="reading-link" key={draft.id} onClick={() => onEdit(draft)} data-testid={`button-resume-${draft.id}`}><span>{draft.title}</span><ChevronRight size={14} /></button>)}
            {!drafts.length && <button type="button" className="reading-link" onClick={() => onNavigate('reader')} data-testid="button-open-reading"><span>{t('overview.explore_chapters', language)}</span><ChevronRight size={14} /></button>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Feed({ 
  annotations, 
  tags, 
  onOpen, 
  onEdit, 
  onDelete, 
  onFavorite, 
  onReference,
  onLike,
  onAddComment,
  onRepost,
  currentUser,
  onOpenProfile,
  onSelectReferencePreview,
  followedUsers,
  onToggleFollow,
  onSendNote,
  onOpenInvestigation
}: { 
  annotations: Annotation[]; 
  tags: string[]; 
  onOpen: () => void; 
  onEdit: (annotation: Annotation) => void; 
  onDelete: (annotation: Annotation) => void; 
  onFavorite: (id: string) => void; 
  onReference: (reference: BibleReference) => void;
  onLike: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
  onRepost: (annotation: Annotation) => void;
  currentUser: FirebaseUser | null;
  onOpenProfile?: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void;
  onSelectReferencePreview?: (reference: BibleReference) => void;
  followedUsers?: string[];
  onToggleFollow?: (authorId: string, authorName: string) => void;
  onSendNote?: (annotation: Annotation) => void;
  onOpenInvestigation?: (annotation: Annotation) => void;
}) {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('todos');
  const [book, setBook] = useState('todos');
  const published = annotations.filter((annotation) => annotation.published);
  const booksInFeed = Array.from(new Set(published.flatMap((annotation) => annotation.references.map((reference) => reference.book)))).sort();
  const filtered = published.filter((annotation) => matchesAnnotation(annotation, search, tag, book)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <section className="page"><div className="eyebrow">um lugar para compartilhar o que ficou</div><div className="notes-header"><div><h1 className="page-title">Mural de reflexões</h1><p className="page-intro">Páginas abertas, pensamentos curtos e a companhia de outras leituras.</p></div><button type="button" className="primary-button" onClick={onOpen} data-testid="button-new-feed-annotation"><Plus size={15} /> Publicar uma anotação</button></div>
      <div className="feed-layout"><div className="feed-main"><div className="device-banner"><Info size={15} /><span>Mural público sincronizado no Cloud Firestore. Você pode curtir, comentar e recompartilhar reflexões.</span></div><div className="feed-toolbar" style={{ marginTop: 14 }}><div className="search-wrap"><Search size={15} /><input type="search" className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no mural..." data-testid="input-search-feed" /></div><select className="select-field filter-select" value={book} onChange={(event) => setBook(event.target.value)} aria-label="Filtrar mural por livro" data-testid="select-feed-book"><option value="todos">Todos os livros</option>{booksInFeed.map((item, idx) => <option key={`feed-book-${item}-${idx}`} value={item}>{item}</option>)}</select><select className="select-field filter-select" value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Filtrar mural por etiqueta" data-testid="select-feed-tag"><option value="todos">Todas as etiquetas</option>{tags.map((item, idx) => <option key={`feed-tag-${item}-${idx}`} value={item}>{item}</option>)}</select></div><div className="notes-count">{filtered.length} {filtered.length === 1 ? 'reflexão no mural' : 'reflexões no mural'}</div>{filtered.length ? filtered.map((annotation) => <AnnotationCard key={annotation.id} annotation={annotation} annotations={annotations} currentUser={currentUser} onEdit={onEdit} onDelete={onDelete} onFavorite={onFavorite} onReference={onReference} onLike={onLike} onAddComment={onAddComment} onRepost={onRepost} onOpenProfile={onOpenProfile} onSelectReferencePreview={onSelectReferencePreview} followedUsers={followedUsers} onToggleFollow={onToggleFollow} onSendNote={onSendNote} onOpenInvestigation={onOpenInvestigation} />) : <EmptyState title="Nada apareceu ainda" text="Tente outra palavra ou publique uma reflexão a partir do que está lendo." action="Abrir compositor" onAction={onOpen} />}</div><aside className="feed-aside"><DraftPanel annotations={annotations} onEdit={onEdit} /><div className="paper-card side-panel"><h3>Como funciona</h3><p className="side-panel-intro">Finalize uma anotação quando ela ganhar forma. Publique quando quiser colocá-la no mural público.</p><button type="button" className="text-button" onClick={onOpen} data-testid="button-how-to-post">Escrever agora <ArrowRight size={13} /></button></div></aside></div>
    </section>
  );
}

function MyAnnotations({ 
  annotations, 
  tags, 
  onOpen, 
  onEdit, 
  onDelete, 
  onFavorite, 
  onReference,
  onLike,
  onAddComment,
  onRepost,
  currentUser,
  onOpenProfile,
  onSelectReferencePreview,
  followedUsers,
  onToggleFollow,
  onSendNote,
  language = 'pt-BR',
  onOpenInvestigation
}: { 
  annotations: Annotation[]; 
  tags: string[]; 
  onOpen: () => void; 
  onEdit: (annotation: Annotation) => void; 
  onDelete: (annotation: Annotation) => void; 
  onFavorite: (id: string) => void; 
  onReference: (reference: BibleReference) => void;
  onLike: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
  onRepost: (annotation: Annotation) => void;
  currentUser: FirebaseUser | null;
  onOpenProfile?: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void;
  onSelectReferencePreview?: (reference: BibleReference) => void;
  followedUsers?: string[];
  onToggleFollow?: (authorId: string, authorName: string) => void;
  onSendNote?: (annotation: Annotation) => void;
  language?: Language;
  onOpenInvestigation?: (annotation: Annotation) => void;
}) {
  const [scope, setScope] = useState<'all' | 'drafts' | 'finalized' | 'published'>('all');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('todos');
  const [book, setBook] = useState('todos');
  const booksInNotes = Array.from(new Set(annotations.flatMap((annotation) => annotation.references.map((reference) => reference.book)))).sort();
  const filtered = annotations.filter((annotation) => {
    const scoped = scope === 'all' || (scope === 'drafts' && annotation.status === 'draft') || (scope === 'finalized' && annotation.status === 'finalized') || (scope === 'published' && annotation.published);
    return scoped && matchesAnnotation(annotation, search, tag, book);
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const counts = { all: annotations.length, drafts: annotations.filter((item) => item.status === 'draft').length, finalized: annotations.filter((item) => item.status === 'finalized').length, published: annotations.filter((item) => item.published).length };
  return <section className="page"><div className="eyebrow">o que você já percebeu</div><div className="notes-header"><div><h1 className="page-title">Minhas anotações</h1><p className="page-intro">Um índice vivo das conversas que você tem tido com a Escritura.</p></div><button type="button" className="primary-button" onClick={onOpen} data-testid="button-add-note-list"><Plus size={15} /> Nova anotação</button></div><div className="scope-tabs">{([['all', 'Todas'], ['drafts', 'Rascunhos'], ['finalized', 'Finalizadas'], ['published', 'No mural']] as [typeof scope, string][]).map(([key, label]) => <button type="button" className={`scope-tab ${scope === key ? 'active' : ''}`} onClick={() => setScope(key)} key={key} data-testid={`tab-notes-${key}`}>{label} <span>{counts[key]}</span></button>)}</div><div className="notes-filter-row"><div className="search-wrap"><Search size={15} /><input type="search" className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título, frase, passagem ou etiqueta..." data-testid="input-search-notes" /></div><select className="select-field filter-select" value={book} onChange={(event) => setBook(event.target.value)} aria-label="Filtrar anotações por livro" data-testid="select-notes-book"><option value="todos">Todos os livros</option>{booksInNotes.map((item, idx) => <option key={`notes-book-${item}-${idx}`} value={item}>{item}</option>)}</select><select className="select-field filter-select" value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Filtrar anotações por etiqueta" data-testid="select-notes-tag"><option value="todos">Todas as etiquetas</option>{tags.map((item, idx) => <option key={`notes-tag-${item}-${idx}`} value={item}>{item}</option>)}</select></div><div className="notes-count">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</div><div>{filtered.length ? filtered.map((annotation) => <AnnotationCard key={annotation.id} annotation={annotation} annotations={annotations} currentUser={currentUser} onEdit={onEdit} onDelete={onDelete} onFavorite={onFavorite} onReference={onReference} onLike={onLike} onAddComment={onAddComment} onRepost={onRepost} onOpenProfile={onOpenProfile} onSelectReferencePreview={onSelectReferencePreview} followedUsers={followedUsers} onToggleFollow={onToggleFollow} onSendNote={onSendNote} onOpenInvestigation={onOpenInvestigation} />) : <EmptyState title="Nenhuma anotação encontrada" text="Tente remover um filtro ou buscar por outra palavra." action="Limpar busca" onAction={() => { setSearch(''); setTag('todos'); setBook('todos'); }} />}</div></section>;
}

function matchesAnnotation(annotation: Annotation, search: string, tag: string, book: string) {
  const query = search.toLowerCase().trim();
  const haystack = [annotation.title, annotation.mainPoint, ...annotation.phrases, ...annotation.tags, ...annotation.references.map((reference) => reference.label)].join(' ').toLowerCase();
  return (!query || haystack.includes(query)) && (tag === 'todos' || annotation.tags.includes(tag)) && (book === 'todos' || annotation.references.some((reference) => reference.book === book));
}

function AnnotationCard({ 
  annotation, 
  annotations, 
  currentUser,
  onEdit, 
  onDelete, 
  onFavorite, 
  onReference,
  onLike,
  onAddComment,
  onRepost,
  onOpenProfile,
  onSelectReferencePreview,
  followedUsers,
  onToggleFollow,
  onSendNote,
  onOpenInvestigation
}: { 
  annotation: Annotation; 
  annotations: Annotation[]; 
  currentUser: FirebaseUser | null;
  onEdit: (annotation: Annotation) => void; 
  onDelete: (annotation: Annotation) => void; 
  onFavorite: (id: string) => void; 
  onReference: (reference: BibleReference) => void;
  onLike: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
  onRepost: (annotation: Annotation) => void;
  onOpenProfile?: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void;
  onSelectReferencePreview?: (reference: BibleReference) => void;
  followedUsers?: string[];
  onToggleFollow?: (authorId: string, authorName: string) => void;
  onSendNote?: (annotation: Annotation) => void;
  onOpenInvestigation?: (annotation: Annotation) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const connections = annotations.filter((item) => annotation.linkedAnnotationIds.includes(item.id));
  const uid = currentUser?.uid || 'guest';
  const isOwner = annotation.authorId ? (annotation.authorId === uid) : (uid === 'guest');
  const isLiked = (annotation.likedBy || []).includes(uid);
  const likesCount = annotation.likesCount || 0;
  const comments = annotation.comments || [];
  const repostsCount = annotation.repostsCount || 0;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(annotation.id, commentText);
    setCommentText('');
  };

  return (
    <article className={`paper-card feed-card ${annotation.color}`} data-testid={`card-annotation-${annotation.id}`}>
      <div 
        className="post-head" 
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}
          onClick={() => onOpenProfile?.({ authorId: annotation.authorId || 'guest', authorName: annotation.authorName, authorPhoto: annotation.authorPhoto })}
          title={`Ver perfil de ${annotation.authorName}`}
        >
          {annotation.authorPhoto ? (
            <img src={annotation.authorPhoto} alt={annotation.authorName} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="post-avatar">{annotation.authorInitial}</div>
          )}
          <div className="post-byline">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="post-author" data-testid={`text-author-${annotation.id}`}>{annotation.authorName}</span>
              {!isOwner && annotation.authorId && annotation.authorId !== 'guest' && (
                <button
                  type="button"
                  className="follow-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollow?.(annotation.authorId!, annotation.authorName);
                  }}
                  style={{
                    background: followedUsers?.includes(annotation.authorId) ? 'hsl(var(--accent) / 0.15)' : 'transparent',
                    color: followedUsers?.includes(annotation.authorId) ? 'hsl(var(--accent))' : 'inherit',
                    border: '1px solid hsl(var(--input))',
                    borderRadius: 12,
                    padding: '1px 7px',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontWeight: 500
                  }}
                >
                  {followedUsers?.includes(annotation.authorId) ? <UserCheck size={11} /> : <UserPlus size={11} />}
                  {followedUsers?.includes(annotation.authorId) ? 'Seguindo' : 'Seguir'}
                </button>
              )}
            </div>
            <div className="post-date">{formatDate(annotation.updatedAt)} · {annotation.published ? 'no mural público' : 'rascunho'}</div>
          </div>
        </div>

        <div className="post-statuses">
          {annotation.status === 'finalized' && <span className="status-badge" data-testid={`status-finalized-${annotation.id}`}><Check size={9} /> finalizada</span>}
          {annotation.published && <span className="status-badge published" data-testid={`status-published-${annotation.id}`}>publicada</span>}
          {!annotation.published && <span className="status-badge draft">rascunho</span>}
        </div>
      </div>

      <div 
        className="card-clickable-study" 
        onClick={() => onOpenInvestigation?.(annotation)}
        style={{ cursor: 'pointer' }}
        title="Clique no bloco para abrir o Mural de Investigação (Caminhos e Conexões deste Estudo)"
      >
        <h3 className="post-title" data-testid={`text-title-${annotation.id}`}>{annotation.title}</h3>
        <p className="post-point" data-testid={`text-point-${annotation.id}`}>{annotation.mainPoint}</p>

        {annotation.phrases.length > 0 && (
          <div className="phrase-list">
            {annotation.phrases.map((phrase, index) => (
              <div className="phrase" key={`${annotation.id}-phrase-${index}`} data-testid={`text-phrase-${annotation.id}-${index}`}>{phrase}</div>
            ))}
          </div>
        )}
      </div>

      <div className="reference-row">
        {annotation.references.map((reference, idx) => (
          <button 
            type="button" 
            className="reference-chip" 
            key={reference.id || `card-ref-${annotation.id}-${idx}`} 
            onClick={() => onSelectReferencePreview ? onSelectReferencePreview(reference) : onReference(reference)} 
            data-testid={`button-reference-${annotation.id}-${reference.id || idx}`}
            title="Ver versículo e abrir na Bíblia"
          >
            <BookOpen size={11} />{reference.label}
          </button>
        ))}
      </div>

      {/* Social Interaction Buttons: Curtir, Comentar, Recompartilhar */}
      <div className="social-bar">
        <button 
          type="button" 
          className={`social-action ${isLiked ? 'liked' : ''}`}
          onClick={() => onLike(annotation.id)}
          data-testid={`button-like-${annotation.id}`}
        >
          <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} color={isLiked ? 'hsl(var(--accent))' : undefined} />
          <span>{likesCount} {likesCount === 1 ? 'Curtida' : 'Curtidas'}</span>
        </button>

        <button 
          type="button" 
          className="social-action"
          onClick={() => setShowComments(!showComments)}
          data-testid={`button-comments-${annotation.id}`}
        >
          <MessageSquare size={14} />
          <span>{comments.length} {comments.length === 1 ? 'Comentário' : 'Comentários'}</span>
        </button>

        <button 
          type="button" 
          className="social-action"
          onClick={() => onRepost(annotation)}
          data-testid={`button-repost-${annotation.id}`}
        >
          <Repeat size={14} />
          <span>{repostsCount} {repostsCount === 1 ? 'Repost' : 'Reposts'}</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="comments-section">
          {comments.map((comment) => (
            <div className="comment-item" key={comment.id}>
              {comment.authorPhoto ? (
                <img src={comment.authorPhoto} alt={comment.authorName} className="comment-avatar" />
              ) : (
                <div className="comment-avatar avatar" style={{ width: 24, height: 24, fontSize: 11 }}>{comment.authorName[0].toUpperCase()}</div>
              )}
              <div className="comment-body">
                <div className="comment-author">{comment.authorName}</div>
                <div>{comment.text}</div>
              </div>
            </div>
          ))}
          <form className="comment-input-row" onSubmit={handleCommentSubmit}>
            <input 
              type="text" 
              className="comment-input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              data-testid={`input-comment-${annotation.id}`}
            />
            <button type="submit" className="primary-button" style={{ padding: '6px 12px' }}>Enviar</button>
          </form>
        </div>
      )}

      <div className="card-footer">
        <div className="pill-row">
          {annotation.tags.map((tag) => <span className="pill" key={tag}>{tag}</span>)}
          {connections.length > 0 && <span className="pill"><Link2 size={10} style={{ verticalAlign: '-2px', marginRight: 3 }} />{connections.length} conexão{connections.length > 1 ? 'ões' : ''}</span>}
        </div>
        <div className="card-actions">
          <button type="button" className="icon-button" onClick={() => onSendNote?.(annotation)} aria-label="Enviar anotação para um amigo" title="Enviar para um escritor" data-testid={`button-send-${annotation.id}`}><Send size={14} /></button>
          <button type="button" className="icon-button" onClick={() => onFavorite(annotation.id)} aria-label={annotation.favorite ? 'Remover dos favoritos' : 'Favoritar anotação'} title={annotation.favorite ? 'Remover dos salvos' : 'Salvar / Favoritar'} data-testid={`button-favorite-${annotation.id}`}><Heart size={14} fill={annotation.favorite ? 'currentColor' : 'none'} color={annotation.favorite ? 'hsl(var(--accent))' : undefined} /></button>
          {isOwner && (
            <>
              <button type="button" className="icon-button" onClick={() => onEdit(annotation)} aria-label="Editar anotação" title="Editar anotação" data-testid={`button-edit-${annotation.id}`}><Edit3 size={14} /></button>
              <button type="button" className="icon-button" onClick={() => onDelete(annotation)} aria-label="Excluir anotação" title="Excluir anotação" data-testid={`button-delete-${annotation.id}`}><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function SendNoteModal({
  annotation,
  currentUser,
  followedUsers = [],
  annotations = [],
  onClose,
  onSend
}: {
  annotation: Annotation;
  currentUser: FirebaseUser | null;
  followedUsers?: string[];
  annotations: Annotation[];
  onClose: () => void;
  onSend: (recipientId: string, recipientName: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const writersList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; photo?: string; isFollowed: boolean }>();
    const uid = currentUser?.uid || 'guest';

    followedUsers.forEach((id) => {
      const match = annotations.find(a => a.authorId === id);
      map.set(id, {
        id,
        name: match ? match.authorName : id,
        photo: match?.authorPhoto,
        isFollowed: true
      });
    });

    annotations.forEach((a) => {
      if (a.authorId && a.authorId !== uid && a.authorId !== 'guest') {
        if (!map.has(a.authorId)) {
          map.set(a.authorId, {
            id: a.authorId,
            name: a.authorName,
            photo: a.authorPhoto,
            isFollowed: followedUsers.includes(a.authorId)
          });
        }
      }
    });

    return Array.from(map.values());
  }, [annotations, followedUsers, currentUser]);

  const filteredWriters = writersList.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 100%)' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ fontSize: '20px' }}>Enviar anotação</h2>
            <p className="modal-subtitle">Envie uma cópia direta de "{annotation.title}" para outro escritor.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar modal"><X size={16} /></button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="chip-entry" style={{ padding: '8px 12px' }}>
            <Search size={14} color="hsl(var(--muted-foreground))" style={{ marginRight: 6 }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nome de quem você segue ou outros leitores..."
              style={{ width: '100%', border: 0, outline: 0, background: 'transparent', fontSize: '12px' }}
              data-testid="input-search-recipient"
            />
          </div>
        </div>

        <div style={{ maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 6, marginBottom: 16 }}>
          {filteredWriters.map((writer) => (
            <div
              key={writer.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid hsl(var(--border))',
                background: 'hsl(var(--background) / 0.5)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {writer.photo ? (
                  <img src={writer.photo} alt={writer.name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>{writer.name[0]?.toUpperCase()}</div>
                )}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{writer.name}</div>
                  {writer.isFollowed && <div style={{ fontSize: '10px', color: 'hsl(var(--accent))' }}>Você segue este escritor</div>}
                </div>
              </div>

              <button
                type="button"
                className="primary-button"
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => onSend(writer.id, writer.name)}
                data-testid={`button-send-to-${writer.id}`}
              >
                <Send size={12} /> Enviar
              </button>
            </div>
          ))}

          {searchTerm.trim().length > 1 && !filteredWriters.some(w => w.name.toLowerCase() === searchTerm.trim().toLowerCase()) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px dashed hsl(var(--accent))',
                background: 'hsl(var(--accent) / 0.06)',
                marginTop: 4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>@</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Enviar para "@{searchTerm.trim().replace(/^@/, '')}"</div>
                  <div style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))' }}>Enviar nota direta para este nome de usuário</div>
                </div>
              </div>
              <button
                type="button"
                className="primary-button"
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => onSend(searchTerm.trim().replace(/^@/, ''), searchTerm.trim().replace(/^@/, ''))}
                data-testid="button-send-to-custom"
              >
                <Send size={12} /> Enviar
              </button>
            </div>
          )}

          {filteredWriters.length === 0 && !searchTerm.trim() && (
            <div style={{ padding: 20, textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}>
              Nenhum escritor na sua lista ainda. Digite um nome acima para enviar diretamente!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DraftPanel({ annotations, onEdit }: { annotations: Annotation[]; onEdit: (annotation: Annotation) => void }) {
  const drafts = annotations.filter((annotation) => annotation.status === 'draft');
  return <div className="draft-panel"><div className="eyebrow" style={{ color: 'hsl(var(--accent))' }}>continuidade</div><h3>Suas páginas abertas</h3><p>Rascunhos ficam só no seu caderno até você decidir o que fazer com eles.</p>{drafts.slice(0, 3).map((draft) => <button type="button" className="draft-link" key={draft.id} onClick={() => onEdit(draft)} data-testid={`button-draft-${draft.id}`}>{draft.title} <ChevronRight size={13} style={{ verticalAlign: '-3px', float: 'right' }} /></button>)}{!drafts.length && <span style={{ fontSize: 11, color: 'hsl(var(--primary-foreground) / .65)' }}>Nenhum rascunho por enquanto.</span>}</div>;
}

function SavedPanel({ saved, onNavigate }: { saved: SavedPassage[]; onNavigate: (view: View) => void }) {
  return <div className="paper-card side-panel"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3>Leituras guardadas</h3><Bookmark size={17} color="hsl(var(--accent))" /></div><p className="side-panel-intro">{saved.length ? 'Passagens para revisitar com calma.' : 'Guarde uma passagem durante a leitura.'}</p>{saved.slice(0, 2).map((passage) => <button type="button" className="reading-link" key={passage.id} onClick={() => onNavigate('reader')} data-testid={`button-saved-${passage.id}`}><span>{passage.reference.label}</span><small>{passage.title}</small></button>)}{!saved.length && <button type="button" className="text-button" onClick={() => onNavigate('reader')} data-testid="button-find-passage">Encontrar uma passagem <ArrowRight size={13} /></button>}</div>;
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><Feather size={23} strokeWidth={1.5} /><h3>{title}</h3><p>{text}</p><button type="button" className="primary-button" onClick={onAction} data-testid="button-empty-action"><Plus size={14} /> {action}</button></div>;
}

function Reader({ preferences, annotations, saved, onPreferences, onOpen, onSavePassage }: { preferences: Preferences; annotations: Annotation[]; saved: SavedPassage[]; onPreferences: (patch: Partial<Preferences>) => void; onOpen: (reference?: BibleReference) => void; onSavePassage: (passage: SavedPassage) => void }) {
  const currentBook = books.find((book) => book.name === preferences.selectedBook) ?? books[0];
  const verses = verseSamples[`${preferences.selectedBook}-${preferences.selectedChapter}`] ?? [`Este é um espaço de leitura para ${preferences.selectedBook} ${preferences.selectedChapter}.`, 'Leia devagar. Repare nas palavras que pedem mais tempo e deixe uma anotação quando algo se acender.', 'A leitura não precisa terminar aqui. Volte a este capítulo sempre que quiser.'];
  const related = annotations.filter((annotation) => annotation.references.some((reference) => reference.book === preferences.selectedBook && reference.chapter === preferences.selectedChapter));
  const currentReference = makeReference(preferences.selectedBook, preferences.selectedChapter, 1, verses.length);
  const currentPassage: SavedPassage = { id: `passage-${preferences.selectedBook}-${preferences.selectedChapter}`, reference: currentReference, title: `Leitura de ${currentBook.name}`, excerpt: verses[0], color: 'sage' };
  const isSaved = saved.some((passage) => passage.reference.label === currentPassage.reference.label);
  const readerSize = preferences.readerSize === 'small' ? '17px' : preferences.readerSize === 'large' ? '23px' : '20px';
  return <section className="page"><div className="eyebrow">leitura com calma</div><h1 className="page-title">Ler a Bíblia</h1><p className="page-intro">Escolha um livro, encontre um capítulo e deixe a leitura abrir uma nova pergunta.</p><div className="reader-layout"><div className="paper-card book-browser"><div className="browser-title">Livros</div><div className="book-list">{books.map((book) => <button type="button" className={`book-button ${book.name === preferences.selectedBook ? 'selected' : ''}`} onClick={() => onPreferences({ selectedBook: book.name, selectedChapter: 1 })} key={book.name} data-testid={`button-book-${book.name}`}><span>{book.name}</span><span>{book.chapters}</span></button>)}</div></div><div className="paper-card reader-paper"><div className="reader-kicker"><BookOpen size={13} /> {currentBook.testament}</div><h2 className="reader-title">{preferences.selectedBook}</h2><p className="reader-sub">Escolha um capítulo para começar</p><div className="chapter-scroll">{Array.from({ length: currentBook.chapters }, (_, index) => index + 1).slice(0, 50).map((chapter) => <button type="button" className={`chapter-button ${chapter === preferences.selectedChapter ? 'selected' : ''}`} onClick={() => onPreferences({ selectedChapter: chapter })} key={chapter} data-testid={`button-chapter-${chapter}`}>{chapter}</button>)}</div><div className="verse-list">{verses.map((text, index) => <div className="verse" key={`${currentReference.label}-${index}`}><div className="verse-number" style={{ visibility: preferences.showVerseNumbers ? 'visible' : 'hidden' }}>{index + 1}</div><p className="verse-text" style={{ '--reader-size': readerSize } as CSSProperties}>{text}</p></div>)}</div><div className="verse-actions"><button type="button" className="primary-button" onClick={() => onOpen(currentReference)} data-testid="button-note-from-reader"><Plus size={15} /> Anotar nesta passagem</button><button type="button" className="outline-button" onClick={() => onSavePassage(currentPassage)} data-testid="button-save-passage"><Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Leitura guardada' : 'Guardar leitura'}</button></div>{related.length > 0 && <div className="related-note"><div className="eyebrow">suas anotações aqui</div><div className="pill-row">{related.map((annotation) => <span className="pill" key={annotation.id}><FileText size={10} style={{ verticalAlign: '-2px', marginRight: 4 }} />{annotation.title}</span>)}</div></div>}</div></div></section>;
}

function PreferencesView({ preferences, onPreferences, annotations, saved, onClear }: { preferences: Preferences; onPreferences: (patch: Partial<Preferences>) => void; annotations: Annotation[]; saved: SavedPassage[]; onClear: () => void }) {
  const lang = preferences.language || 'pt-BR';

  const handleLanguageChange = (newLang: Preferences['language']) => {
    onPreferences({
      language: newLang,
      bibleVersion: newLang === 'en' && preferences.bibleVersion === 'almeida' ? 'kjv' : preferences.bibleVersion
    });
  };

  return (
    <section className="page">
      <div className="eyebrow">{lang === 'en' ? 'your way back' : 'seu jeito de voltar'}</div>
      <h1 className="page-title">{t('pref.title', lang)}</h1>
      <p className="page-intro">{t('pref.intro', lang)}</p>
      <div className="settings">
        <div className="paper-card settings-card">
          <div className="setting-row">
            <div>
              <h3>{t('pref.font_size_label', lang)}</h3>
              <p>{lang === 'en' ? 'Increase or decrease system text size across all views.' : 'Aumente ou diminua a letra de todo o sistema (menus, títulos, notas e botões).'}</p>
            </div>
            <div className="segmented">
              {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                <button
                  type="button"
                  className={`segment ${(preferences.systemFontSize || 'medium') === size ? 'active' : ''}`}
                  onClick={() => onPreferences({ systemFontSize: size })}
                  key={size}
                  data-testid={`button-system-font-size-${size}`}
                >
                  {size === 'small' ? t('pref.font_size_small', lang) : size === 'medium' ? t('pref.font_size_medium', lang) : size === 'large' ? t('pref.font_size_large', lang) : t('pref.font_size_xlarge', lang)}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('pref.language_label', lang)}</h3>
              <p>{t('pref.language_desc', lang)}</p>
            </div>
            <select 
              className="select-field setting-select" 
              value={preferences.language} 
              onChange={(event) => handleLanguageChange(event.target.value as Preferences['language'])} 
              aria-label="Escolher idioma" 
              data-testid="select-language"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English (US / UK)</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('pref.theme_label', lang)}</h3>
              <p>{lang === 'en' ? 'Choose the light that accompanies your devotions.' : 'Escolha a luz que acompanha seu momento.'}</p>
            </div>
            <div className="segmented">
              <button type="button" className={`segment ${preferences.theme === 'light' ? 'active' : ''}`} onClick={() => onPreferences({ theme: 'light' })} data-testid="button-theme-light"><Eye size={13} /> {t('pref.theme_light', lang)}</button>
              <button type="button" className={`segment ${preferences.theme === 'dark' ? 'active' : ''}`} onClick={() => onPreferences({ theme: 'dark' })} data-testid="button-theme-dark"><EyeOff size={13} /> {t('pref.theme_dark', lang)}</button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <h3>{lang === 'en' ? 'Verse text size' : 'Tamanho do texto dos versículos'}</h3>
              <p>{lang === 'en' ? 'Define visual pace of verses in the reader.' : 'Defina o ritmo visual dos versículos no leitor.'}</p>
            </div>
            <div className="segmented">
              {(['small', 'medium', 'large'] as Preferences['readerSize'][]).map((size) => (
                <button type="button" className={`segment ${preferences.readerSize === size ? 'active' : ''}`} onClick={() => onPreferences({ readerSize: size })} key={size} data-testid={`button-reader-size-${size}`}>{size === 'small' ? t('pref.font_size_small', lang) : size === 'medium' ? t('pref.font_size_medium', lang) : t('pref.font_size_large', lang)}</button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div>
              <h3>{t('pref.verse_numbers_label', lang)}</h3>
              <p>{t('pref.verse_numbers_desc', lang)}</p>
            </div>
            <button type="button" className={`switch ${preferences.showVerseNumbers ? 'on' : ''}`} onClick={() => onPreferences({ showVerseNumbers: !preferences.showVerseNumbers })} aria-label="Alternar números dos versículos" data-testid="button-toggle-verse-numbers"><span /></button>
          </div>
        </div>
        <div className="paper-card local-data-card">
          <h3>{t('pref.local_data_title', lang)}</h3>
          <p>{lang === 'en' ? `This notebook lives in this browser. You have ${annotations.length} notes and ${saved.length} saved passages. Clearing data cannot be undone.` : `Este caderno vive neste navegador. Você tem ${annotations.length} anotações e ${saved.length} passagens guardadas. Limpar os dados não pode ser desfeito.`}</p>
          <button type="button" className="outline-button danger-button" onClick={onClear} data-testid="button-clear-local-data"><Trash2 size={14} /> {t('pref.clear_data_btn', lang)}</button>
        </div>
      </div>
    </section>
  );
}

function AnnotationComposer({ 
  annotation, 
  initialReference, 
  annotations, 
  onCancel, 
  onPersist,
  onChoiceMade,
  onClosedWithoutChoice
}: { 
  annotation?: Annotation; 
  initialReference?: BibleReference; 
  annotations: Annotation[]; 
  onCancel: () => void; 
  onPersist: (draft: AnnotationDraft, editingId?: string, reason?: string) => string | void;
  onChoiceMade?: (noteId: string) => void;
  onClosedWithoutChoice?: (noteId: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | undefined>(annotation?.id);
  const [autoSaveLabel, setAutoSaveLabel] = useState<string>('');
  const [title, setTitle] = useState(annotation?.title ?? '');
  const [mainPoint, setMainPoint] = useState(annotation?.mainPoint ?? '');
  const [phrases, setPhrases] = useState<string[]>(annotation?.phrases ?? []);
  const [phraseInput, setPhraseInput] = useState('');
  const [references, setReferences] = useState<BibleReference[]>(annotation?.references ?? (initialReference ? [initialReference] : []));
  const [tags, setTags] = useState<string[]>(annotation?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [color, setColor] = useState<ColorName>(annotation?.color ?? 'terracotta');
  const [status, setStatus] = useState<AnnotationStatus>(annotation?.status ?? 'draft');
  const [published, setPublished] = useState(annotation?.published ?? false);
  const [linkedIds, setLinkedIds] = useState<string[]>(annotation?.linkedAnnotationIds ?? []);
  const [refBook, setRefBook] = useState(initialReference?.book ?? 'João');
  const [refChapter, setRefChapter] = useState(String(initialReference?.chapter ?? 3));
  const [refStart, setRefStart] = useState(String(initialReference?.verseStart ?? 1));
  const [refEnd, setRefEnd] = useState(initialReference?.verseEnd ? String(initialReference.verseEnd) : '');
  
  // Fullscreen Apple Notes mode state
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Selection popover state
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!selectionMenu) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.floating-text-menu')) {
        setSelectionMenu(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [selectionMenu]);

  const meaningful = Boolean(title.trim() || mainPoint.trim() || phrases.length || references.length || tags.length);
  const addPhrase = () => { const value = phraseInput.trim(); if (value && !phrases.includes(value)) { setPhrases((current) => [...current, value]); setPhraseInput(''); } };
  const addTag = () => { const value = tagInput.trim().replace(/^#/, ''); if (value && !tags.includes(value)) { setTags((current) => [...current, value]); setTagInput(''); } };
  const addReference = () => { const chapter = Number(refChapter); const start = Number(refStart); if (!refBook || !chapter || !start) return; const next = makeReference(refBook, chapter, start, refEnd ? Number(refEnd) : undefined); if (!references.some((item) => item.label === next.label)) setReferences((current) => [...current, next]); };
  const buildDraft = (nextStatus?: AnnotationStatus, nextPublished?: boolean): AnnotationDraft => ({
    authorName: annotation?.authorName ?? 'Meu caderno',
    authorInitial: annotation?.authorInitial ?? 'M',
    title: title.trim() || 'Anotação sem título',
    mainPoint: mainPoint.trim(),
    phrases,
    references,
    tags,
    color,
    status: typeof nextStatus === 'string' ? (nextStatus as AnnotationStatus) : status,
    published: typeof nextPublished === 'boolean' ? nextPublished : published,
    favorite: annotation?.favorite ?? false,
    linkedAnnotationIds: linkedIds
  });

  // 5-second automatic save timer for active edits
  useEffect(() => {
    if (!title.trim() && !mainPoint.trim() && !phrases.length && !references.length && !tags.length) return;
    const timer = setInterval(() => {
      const draft = buildDraft(status, published);
      const savedId = onPersist(draft, activeId, 'autosave');
      if (typeof savedId === 'string' && savedId && !activeId) {
        setActiveId(savedId);
      }
      setAutoSaveLabel('Salvo automaticamente');
      setTimeout(() => setAutoSaveLabel(''), 2000);
    }, 5000);

    return () => clearInterval(timer);
  }, [title, mainPoint, phrases, references, tags, color, status, published, linkedIds, activeId]);

  const persistAndClose = (reason?: string, nextStatus?: AnnotationStatus, nextPublished?: boolean) => {
    const safeReason = typeof reason === 'string' ? reason : 'save';
    const safeStatus = typeof nextStatus === 'string' ? (nextStatus as AnnotationStatus) : status;
    const safePublished = typeof nextPublished === 'boolean' ? nextPublished : published;
    const targetId = onPersist(buildDraft(safeStatus, safePublished), activeId, safeReason);
    const noteId = (typeof targetId === 'string' && targetId) ? targetId : activeId;
    if (noteId) {
      onChoiceMade?.(noteId);
    }
  };

  const closeWithoutLoss = () => {
    if (meaningful) {
      const targetId = onPersist(buildDraft('draft', published), activeId, 'close');
      const noteId = (typeof targetId === 'string' && targetId) ? targetId : activeId;
      if (noteId) onClosedWithoutChoice?.(noteId);
    } else {
      onCancel();
    }
  };

  // Handle double-click / text selection
  const handleTextSelect = (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const target = e.currentTarget;
    const selectedText = target.value.substring(target.selectionStart || 0, target.selectionEnd || 0).trim();
    if (selectedText.length > 0) {
      const rect = target.getBoundingClientRect();
      setSelectionMenu({
        x: Math.max(10, rect.left + (rect.width / 2) - 100),
        y: Math.max(10, rect.top - 50),
        text: selectedText
      });
    } else {
      setSelectionMenu(null);
    }
  };

  const addPhraseFromSelection = (text: string) => {
    if (text && !phrases.includes(text)) {
      setPhrases((current) => [...current, text]);
    }
    setSelectionMenu(null);
  };

  const handleLinkSelectedVerse = (text: string) => {
    // Check if selected text matches a Bible reference format like "João 3:16" or "Salmos 23:1-4"
    const match = text.match(/([1-3]?\s?[A-Za-zÀ-ÿ]+)\s+(\d+)[:.](\d+)(?:-(\d+))?/);
    if (match) {
      const bookName = match[1].trim();
      const foundBook = books.find(b => b.name.toLowerCase() === bookName.toLowerCase());
      if (foundBook) {
        const chapter = parseInt(match[2], 10);
        const verseStart = parseInt(match[3], 10);
        const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;
        const ref = makeReference(foundBook.name, chapter, verseStart, verseEnd);
        if (!references.some(r => r.label === ref.label)) {
          setReferences((prev) => [...prev, ref]);
        }
      } else {
        addReference();
      }
    } else {
      const matchingBook = books.find(b => text.toLowerCase().includes(b.name.toLowerCase()));
      if (matchingBook) {
        setRefBook(matchingBook.name);
      }
      addReference();
    }
    setSelectionMenu(null);
  };

  if (isFullscreen) {
    return (
      <div className="apple-notes-fullscreen">
        <header className="apple-notes-header">
          <button type="button" className="icon-button" onClick={() => setIsFullscreen(false)} aria-label="Sair da tela cheia" title="Sair da tela cheia">
            <Minimize2 size={18} />
          </button>
          <button type="button" className="primary-button" onClick={() => persistAndClose(published ? 'published' : 'save', status, published)}>
            <Check size={15} /> Concluído
          </button>
        </header>

        <div className="apple-notes-editor-container">
          <input
            className="apple-notes-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da sua nota..."
            data-testid="input-apple-notes-title"
          />

          <textarea
            className="apple-notes-body-input"
            value={mainPoint}
            onChange={(e) => setMainPoint(e.target.value)}
            onSelect={handleTextSelect}
            onDoubleClick={handleTextSelect}
            onMouseUp={handleTextSelect}
            onKeyUp={handleTextSelect}
            placeholder="Comece a escrever sua reflexão... Selecione uma palavra ou clique 2 vezes para destacar ou vincular um versículo."
            data-testid="input-apple-notes-body"
          />

          {phrases.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Frases e versículos destacados</div>
              <div className="pill-row">
                {phrases.map((phrase, index) => (
                  <span className="entry-chip" key={`fullscreen-phrase-${index}`}>
                    {phrase}
                    <button type="button" onClick={() => setPhrases(phrases.filter((_, i) => i !== index))}><X size={11} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {references.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Passagens vinculadas</div>
              <div className="pill-row">
                {references.map((ref) => (
                  <span className="entry-chip" key={`fullscreen-ref-${ref.id}`}>
                    <BookOpen size={11} style={{ marginRight: 4 }} />{ref.label}
                    <button type="button" onClick={() => setReferences(references.filter(r => r.id !== ref.id))}><X size={11} /></button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Text Selection Menu */}
        {selectionMenu && (
          <div className="floating-text-menu" style={{ left: selectionMenu.x, top: selectionMenu.y }}>
            <button type="button" className="floating-menu-btn" onClick={() => addPhraseFromSelection(selectionMenu.text)}>
              <PenLine size={13} /> Destacar Frase
            </button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            <button type="button" className="floating-menu-btn" onClick={() => handleLinkSelectedVerse(selectionMenu.text)}>
              <BookOpen size={13} /> Vincular Versículo
            </button>
            <button type="button" className="floating-menu-btn" onClick={() => setSelectionMenu(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* Bottom Floating Bar */}
        <div className="apple-notes-toolbar">
          <div className="color-picker" style={{ gap: 6 }}>
            {(['navy', 'terracotta', 'sage', 'gold', 'plum'] as ColorName[]).map((item) => (
              <button 
                type="button" 
                className={`color-choice ${item} ${color === item ? 'selected' : ''}`} 
                onClick={() => setColor(item)} 
                key={item} 
                style={{ width: 22, height: 22 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeWithoutLoss(); }}>
      <section className="composer-sheet" role="dialog" aria-modal="true" aria-labelledby="composer-title">
        <div className="modal-header">
          <div>
            <div className="eyebrow">{annotation ? 'editar página' : initialReference ? 'anotar uma passagem' : 'nova página'}</div>
            <h2 className="modal-title" id="composer-title">{annotation ? 'Voltar à anotação' : 'O que ficou com você?'}</h2>
            <p className="modal-subtitle">Fechar guarda um rascunho local. Nada do que você digitou desaparece.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              type="button" 
              className="icon-button" 
              onClick={() => setIsFullscreen(true)} 
              title="Modo Escrever em Tela Cheia (Notas do iPhone)"
              data-testid="button-fullscreen-mode"
            >
              <Maximize2 size={18} />
            </button>
            <button type="button" className="icon-button" onClick={closeWithoutLoss} aria-label="Fechar compositor" data-testid="button-close-composer"><X size={18} /></button>
          </div>
        </div>

        {/* Floating Text Selection Menu for normal modal editor */}
        {selectionMenu && (
          <div className="floating-text-menu" style={{ left: selectionMenu.x, top: selectionMenu.y }}>
            <button type="button" className="floating-menu-btn" onClick={() => addPhraseFromSelection(selectionMenu.text)}>
              <PenLine size={13} /> Destacar Frase
            </button>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            <button type="button" className="floating-menu-btn" onClick={() => handleLinkSelectedVerse(selectionMenu.text)}>
              <BookOpen size={13} /> Vincular Versículo
            </button>
            <button type="button" className="floating-menu-btn" onClick={() => setSelectionMenu(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="annotation-title">Título</label>
            <input id="annotation-title" className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Uma frase para lembrar depois" data-testid="input-annotation-title" />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label className="field-label" htmlFor="annotation-point">Ponto principal</label>
              <button type="button" className="text-button" onClick={() => setIsFullscreen(true)} style={{ fontSize: '0.8rem', gap: 4 }}>
                <Maximize2 size={12} /> Abrir no modo Notas
              </button>
            </div>
            <textarea 
              id="annotation-point" 
              className="editor" 
              value={mainPoint} 
              onChange={(event) => setMainPoint(event.target.value)} 
              onSelect={handleTextSelect}
              onDoubleClick={handleTextSelect}
              onMouseUp={handleTextSelect}
              onKeyUp={handleTextSelect}
              placeholder="Escreva com suas palavras o que você percebeu (dê 2 cliques no texto para ações rápidas)..." 
              data-testid="input-annotation-point" 
            />
          </div>
          <div>
            <label className="field-label" htmlFor="annotation-phrase">Frases destacadas</label>
            <div className="chip-entry">
              {phrases.map((phrase, index) => <span className="entry-chip" key={`${phrase}-${index}`}>{phrase}<button type="button" onClick={() => setPhrases((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover frase ${index + 1}`} data-testid={`button-remove-phrase-${index}`}><X size={11} /></button></span>)}
              <input id="annotation-phrase" value={phraseInput} onChange={(event) => setPhraseInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addPhrase(); } }} placeholder="Digite e pressione Enter" data-testid="input-annotation-phrase" />
            </div>
          </div>
          <div>
            <label className="field-label">Referências</label>
            {references.length > 0 && <div className="pill-row" style={{ margin: '0 0 8px' }}>{references.map((reference, index) => <span className="entry-chip" key={reference.id || `composer-ref-${index}-${reference.label}`}>{reference.label}<button type="button" onClick={() => setReferences((current) => current.filter((item) => item.id !== reference.id))} aria-label={`Remover referência ${reference.label}`} data-testid={`button-remove-reference-${reference.id || index}`}><X size={11} /></button></span>)}</div>}
            <div className="reference-builder">
              <select className="field" value={refBook} onChange={(event) => setRefBook(event.target.value)} aria-label="Livro da referência" data-testid="select-reference-book">{books.map((book) => <option key={book.name} value={book.name}>{book.name}</option>)}</select>
              <input className="field" type="number" min="1" value={refChapter} onChange={(event) => setRefChapter(event.target.value)} aria-label="Capítulo da referência" data-testid="input-reference-chapter" />
              <input className="field" type="number" min="1" value={refStart} onChange={(event) => setRefStart(event.target.value)} aria-label="Versículo inicial" data-testid="input-reference-start" />
              <input className="field" type="number" min="1" value={refEnd} onChange={(event) => setRefEnd(event.target.value)} aria-label="Versículo final opcional" placeholder="fim" data-testid="input-reference-end" />
              <button type="button" className="outline-button reference-remove" onClick={addReference} aria-label="Adicionar referência" data-testid="button-add-reference"><Plus size={14} /></button>
            </div>
            <span className="form-hint">Você pode conectar quantas passagens quiser.</span>
          </div>
          <div>
            <label className="field-label" htmlFor="annotation-tag">Etiquetas</label>
            <div className="chip-entry">
              {tags.map((tag) => <span className="entry-chip" key={tag}>#{tag}<button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} aria-label={`Remover etiqueta ${tag}`} data-testid={`button-remove-tag-${tag}`}><X size={11} /></button></span>)}
              <input id="annotation-tag" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } }} placeholder="Adicionar etiqueta e pressionar Enter" data-testid="input-annotation-tag" />
            </div>
          </div>
          <div>
            <span className="field-label">Cor da página</span>
            <div className="color-picker">
              {(['navy', 'terracotta', 'sage', 'gold', 'plum'] as ColorName[]).map((item) => <button type="button" className={`color-choice ${item} ${color === item ? 'selected' : ''}`} onClick={() => setColor(item)} key={item} aria-label={`Escolher cor ${item}`} data-testid={`button-color-${item}`} />)}
            </div>
          </div>
          <div>
            <span className="field-label">Conectar a outras páginas</span>
            <div className="connection-list">
              {annotations.filter((item) => item.id !== annotation?.id).slice(0, 8).map((item) => <label className="connection-item" key={item.id}><input type="checkbox" checked={linkedIds.includes(item.id)} onChange={(event) => setLinkedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} data-testid={`checkbox-connect-${item.id}`} /><span>{item.title}</span></label>)}
            </div>
          </div>
          <div className="publish-toggle">
            <div>
              <strong>{published ? 'Publicar no Mural Público' : 'Privado (Somente no meu caderno)'}</strong>
              <small>{published ? 'Esta reflexão ficará visível para a comunidade no mural público.' : 'Visível apenas para você no seu caderno pessoal.'}</small>
            </div>
            <button type="button" className={`switch ${published ? 'on' : ''}`} onClick={() => setPublished((current) => !current)} aria-label="Alternar publicação no mural" data-testid="button-toggle-publish"><span /></button>
          </div>
        </div>
        <div className="modal-footer">
          <span className="form-hint">Escrevendo em Caderno Bíblico</span>
          <div className="footer-actions">
            <button 
              type="button" 
              className="outline-button" 
              onClick={() => persistAndClose('save', 'draft', published)} 
              data-testid="button-save-draft"
            >
              <FileText size={14} /> Salvar como rascunho
            </button>
            <button 
              type="button" 
              className="primary-button" 
              onClick={() => persistAndClose('finalized', 'finalized', published)} 
              data-testid="button-finalize-annotation"
            >
              <CheckCircle2 size={14} /> Concluir e salvar nota
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function NotificationsPopover({ 
  notifications, 
  onClose, 
  onMarkAllRead 
}: { 
  notifications: AppNotification[]; 
  onClose: () => void; 
  onMarkAllRead: () => void; 
}) {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notification-bell-btn') && !target.closest('.notifications-popover')) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [onClose]);

  return (
    <div className="notifications-popover">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid hsl(var(--border))' }}>
        <h4 style={{ margin: 0, fontFamily: 'var(--app-font-serif)', fontSize: '1.05rem', fontWeight: 600 }}>Notificações</h4>
        <button type="button" className="text-button" onClick={onMarkAllRead} style={{ fontSize: '0.75rem' }}>
          Marcar lidas
        </button>
      </div>
      {notifications.length > 0 ? (
        notifications.map((notif) => (
          <div className={`notif-item ${!notif.read ? 'unread' : ''}`} key={notif.id}>
            <div className="notif-icon-wrap">
              {notif.type === 'follow' && <UserPlus size={15} />}
              {notif.type === 'like' && <Heart size={15} fill="currentColor" />}
              {notif.type === 'repost' && <Repeat size={15} />}
              {notif.type === 'comment' && <MessageSquare size={15} />}
              {notif.type === 'unfinished' && <Clock size={15} color="hsl(var(--accent))" />}
              {notif.type === 'send' && <Send size={15} color="hsl(var(--accent))" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'hsl(var(--foreground))' }}>{notif.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>{notif.message}</div>
              <div style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground) / 0.7)', marginTop: 4 }}>{formatDate(notif.createdAt)}</div>
            </div>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
          Nenhuma notificação por enquanto.
        </div>
      )}
    </div>
  );
}

function ProfilesView({ 
  annotations, 
  currentUser, 
  followedUsers, 
  onToggleFollow, 
  onOpenProfile 
}: { 
  annotations: Annotation[]; 
  currentUser: FirebaseUser | null; 
  followedUsers: string[]; 
  onToggleFollow: (authorId: string, authorName: string) => void; 
  onOpenProfile: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void; 
}) {
  const [search, setSearch] = useState('');

  // Extract unique REAL writers/authors who have published notes or are the logged-in user
  const realAuthors = useMemo(() => {
    const map = new Map<string, { authorId: string; authorName: string; authorPhoto?: string }>();
    
    annotations.forEach((a) => {
      if (a.authorName) {
        const id = a.authorId || a.authorName;
        if (!map.has(id)) {
          map.set(id, {
            authorId: id,
            authorName: a.authorName,
            authorPhoto: a.authorPhoto
          });
        }
      }
    });

    if (currentUser && !map.has(currentUser.uid)) {
      const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'Meu caderno';
      map.set(currentUser.uid, {
        authorId: currentUser.uid,
        authorName: name,
        authorPhoto: currentUser.photoURL || undefined
      });
    }

    return Array.from(map.values());
  }, [annotations, currentUser]);

  const filteredAuthors = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return realAuthors;
    return realAuthors.filter(item => 
      item.authorName.toLowerCase().includes(q) || 
      `@${item.authorName.toLowerCase().replace(/\s+/g, '_')}`.includes(q)
    );
  }, [realAuthors, search]);

  return (
    <section className="page">
      <div className="eyebrow">comunidade de leitores</div>
      <div className="notes-header">
        <div>
          <h1 className="page-title">Buscar escritores</h1>
          <p className="page-intro">Pesquise escritores do mural, veja suas anotações publicadas e siga seus estudos.</p>
        </div>
      </div>

      <div className="feed-toolbar" style={{ marginTop: 20 }}>
        <div className="search-wrap" style={{ maxWidth: 400 }}>
          <Search size={15} />
          <input 
            type="search" 
            className="search-input" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Pesquisar por nome de escritor..." 
            data-testid="input-search-profiles"
          />
        </div>
      </div>

      {filteredAuthors.length > 0 ? (
        <div className="profiles-search-grid">
          {filteredAuthors.map((author) => {
            const authorNotesCount = annotations.filter(a => a.published && (a.authorId === author.authorId || a.authorName === author.authorName)).length;
            const isFollowing = followedUsers.includes(author.authorId);
            const isSelf = currentUser?.uid === author.authorId;
            const initial = (author.authorName[0] || 'L').toUpperCase();

            return (
              <div className="profile-user-card" key={author.authorId}>
                {author.authorPhoto ? (
                  <img src={author.authorPhoto} alt={author.authorName} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', marginBottom: 10 }} />
                ) : (
                  <div className="avatar" style={{ width: 56, height: 56, fontSize: 24, marginBottom: 10 }}>{initial}</div>
                )}
                <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--app-font-serif)', fontSize: '1.1rem', fontWeight: 600 }}>{author.authorName}</h3>
                <p style={{ margin: '0 0 12px', color: 'hsl(var(--muted-foreground))', fontSize: '0.8rem' }}>@{author.authorName.toLowerCase().replace(/\s+/g, '_')}</p>
                
                <div style={{ display: 'flex', gap: 14, fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', marginBottom: 16 }}>
                  <span><strong>{authorNotesCount}</strong> {authorNotesCount === 1 ? 'publicação' : 'publicações'}</span>
                </div>

                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button 
                    type="button" 
                    className="outline-button" 
                    onClick={() => onOpenProfile(author)}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem' }}
                  >
                    Ver perfil
                  </button>
                  {!isSelf && author.authorId && author.authorId !== 'guest' && (
                    <button 
                      type="button" 
                      className={isFollowing ? "outline-button" : "primary-button"}
                      onClick={() => onToggleFollow(author.authorId, author.authorName)}
                      style={{ flex: 1, padding: '7px 10px', fontSize: '0.78rem', gap: 4 }}
                    >
                      {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'hsl(var(--muted-foreground))' }}>
          <p style={{ fontSize: '1rem', margin: 0 }}>Nenhum escritor encontrado com esse nome.</p>
        </div>
      )}
    </section>
  );
}

function UserProfileModal({ 
  profile, 
  annotations, 
  sharedNotes = [],
  onClose,
  onNavigate,
  onEdit, 
  onDelete, 
  onFavorite, 
  onReference,
  onLike,
  onAddComment,
  onRepost,
  onSendNote,
  onAdoptSharedNote,
  currentUser,
  followedUsers = [],
  onToggleFollow,
  onOpenInvestigation,
}: { 
  profile: { authorId: string; authorName: string; authorPhoto?: string };
  annotations: Annotation[]; 
  sharedNotes?: SharedNote[];
  onClose: () => void;
  onNavigate?: (view: View) => void;
  onEdit: (annotation: Annotation) => void; 
  onDelete: (annotation: Annotation) => void; 
  onFavorite: (id: string) => void; 
  onReference: (reference: BibleReference) => void;
  onLike: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
  onRepost: (annotation: Annotation) => void;
  onSendNote?: (annotation: Annotation) => void;
  onAdoptSharedNote?: (shared: SharedNote) => void;
  currentUser: FirebaseUser | null;
  followedUsers?: string[];
  onToggleFollow?: (authorId: string, authorName: string) => void;
  onOpenInvestigation?: (annotation: Annotation) => void;
}) {
  const [activeTab, setActiveTab] = useState<'grid' | 'list' | 'followers' | 'following' | 'shared'>('grid');
  const authorNotes = annotations.filter((a) => a.published && (a.authorId === profile.authorId || a.authorName === profile.authorName));
  const initial = (profile.authorName[0] || 'M').toUpperCase();
  const isSelf = currentUser?.uid === profile.authorId;
  const isFollowing = followedUsers.includes(profile.authorId);
  const handleName = `@${profile.authorName.toLowerCase().replace(/\s+/g, '_')}`;

  const myReceivedNotes = sharedNotes.filter(s => s.recipientId === profile.authorId || s.recipientName === profile.authorName);
  const mySentNotes = sharedNotes.filter(s => s.senderId === profile.authorId || s.senderName === profile.authorName);

  // Find real writers in the community
  const allAuthors = useMemo(() => {
    const map = new Map<string, { authorId: string; authorName: string; authorPhoto?: string }>();
    annotations.forEach((a) => {
      if (a.authorName && a.authorId) {
        if (!map.has(a.authorId)) {
          map.set(a.authorId, { authorId: a.authorId, authorName: a.authorName, authorPhoto: a.authorPhoto });
        }
      }
    });
    return Array.from(map.values());
  }, [annotations]);

  // Real authors followed by profile author
  const realFollowedWriters = useMemo(() => {
    return allAuthors.filter(a => followedUsers.includes(a.authorId) && a.authorId !== profile.authorId);
  }, [allAuthors, followedUsers, profile.authorId]);

  // Real authors who follow profile author (or interacted with profile author's notes)
  const realFollowerWriters = useMemo(() => {
    const followerSet = new Map<string, { authorId: string; authorName: string; authorPhoto?: string }>();
    annotations.forEach(a => {
      const isProfileNote = a.authorId === profile.authorId || a.authorName === profile.authorName;
      if (isProfileNote && a.likedBy) {
        a.likedBy.forEach(uid => {
          if (uid !== profile.authorId) {
            const author = allAuthors.find(x => x.authorId === uid);
            if (author) followerSet.set(uid, author);
          }
        });
      }
    });
    // Add logged-in user if following this profile
    if (currentUser && isFollowing && !followerSet.has(currentUser.uid)) {
      followerSet.set(currentUser.uid, {
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Meu caderno',
        authorPhoto: currentUser.photoURL || undefined
      });
    }
    return Array.from(followerSet.values());
  }, [annotations, profile, allAuthors, currentUser, isFollowing]);

  const handleOpenOtherProfile = (writer: { authorId: string; authorName: string; authorPhoto?: string }) => {
    onClose();
    setTimeout(() => {
      // Trigger opening the other user's profile
      const event = new CustomEvent('open_profile', { detail: writer });
      window.dispatchEvent(event);
    }, 100);
  };

  return (
    <div 
      className="sheet-backdrop" 
      role="presentation" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ zIndex: 1100 }}
    >
      <section className="composer-sheet profile-modal-sheet" style={{ maxWidth: 720, paddingBottom: 80 }}>
        <div className="modal-header" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 240 }}>
            {profile.authorPhoto ? (
              <img src={profile.authorPhoto} alt={profile.authorName} className="user-profile-avatar" style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar" style={{ width: 60, height: 60, fontSize: 24 }}>{initial}</div>
            )}
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.4rem' }}>{profile.authorName}</h2>
              <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>{handleName}</div>
              
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span><strong>{authorNotes.length}</strong> {authorNotes.length === 1 ? 'publicação' : 'publicações'}</span>
                <span><strong>{realFollowerWriters.length}</strong> seguidores</span>
                <span><strong>{realFollowedWriters.length}</strong> seguindo</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isSelf ? (
              <>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => {
                    onClose();
                    onNavigate?.('preferences');
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', gap: 6 }}
                  title="Configurações"
                  data-testid="button-profile-settings"
                >
                  <Settings size={14} /> Configurações
                </button>

                <button
                  type="button"
                  className="outline-button danger-button"
                  onClick={() => {
                    onClose();
                    logoutFirebase();
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.8rem', gap: 6 }}
                  title="Sair da conta"
                  data-testid="button-profile-logout"
                >
                  <LogOut size={14} /> Sair
                </button>
              </>
            ) : (
              profile.authorId && profile.authorId !== 'guest' && (
                <button 
                  type="button" 
                  className={isFollowing ? "outline-button" : "primary-button"}
                  onClick={() => onToggleFollow?.(profile.authorId, profile.authorName)}
                  style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </button>
              )
            )}
            <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar perfil"><X size={18} /></button>
          </div>
        </div>

        <div className="profile-tabs-row" style={{ marginTop: 20 }}>
          <button 
            type="button" 
            className={`profile-tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
            onClick={() => setActiveTab('grid')}
          >
            <Grid size={15} /> Publicações ({authorNotes.length})
          </button>
          <button 
            type="button" 
            className={`profile-tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
            onClick={() => setActiveTab('shared')}
          >
            <Send size={15} /> Enviados ({myReceivedNotes.length + mySentNotes.length})
          </button>
          <button 
            type="button" 
            className={`profile-tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
            onClick={() => setActiveTab('followers')}
          >
            <Users size={15} /> Seguidores ({realFollowerWriters.length})
          </button>
          <button 
            type="button" 
            className={`profile-tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => setActiveTab('following')}
          >
            <UserCheck size={15} /> Seguindo ({realFollowedWriters.length})
          </button>
        </div>

        {/* Tab 1: Block Cards Grid */}
        {activeTab === 'grid' && (
          <div className="profile-instagram-grid">
            {authorNotes.length > 0 ? (
              authorNotes.map((annotation) => (
                <div 
                  className={`profile-grid-card ${annotation.color}`}
                  key={annotation.id}
                  onClick={() => isSelf ? onEdit(annotation) : onOpenInvestigation?.(annotation)}
                >
                  <div>
                    <div className="profile-grid-title">{annotation.title}</div>
                    <div className="profile-grid-excerpt">{annotation.mainPoint}</div>
                  </div>
                  <div>
                    {annotation.references.length > 0 && (
                      <div className="reference-chip" style={{ fontSize: '0.7rem', padding: '2px 6px', marginTop: 6 }}>
                        <BookOpen size={10} /> {annotation.references[0].label}
                      </div>
                    )}
                    <div className="profile-grid-footer">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Heart size={11} fill="currentColor" /> {annotation.likesCount || 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Repeat size={11} /> {annotation.repostsCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-message" style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
                Nenhuma publicação encontrada.
              </p>
            )}
          </div>
        )}

        {/* Tab: Shared Notes */}
        {activeTab === 'shared' && (
          <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
            {myReceivedNotes.length > 0 && (
              <div>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--accent))', marginBottom: 10, fontWeight: 700 }}>
                  Notas enviadas para {isSelf ? 'você' : profile.authorName}
                </h4>
                <div style={{ display: 'grid', gap: 10 }}>
                  {myReceivedNotes.map((shared) => (
                    <div className={`paper-card ${shared.color}`} key={shared.id} style={{ padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Send size={12} /> Enviado por <strong>@{shared.senderName}</strong> em {new Date(shared.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontFamily: 'var(--app-font-serif)' }}>{shared.title}</h4>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'hsl(var(--foreground))', opacity: 0.9 }}>{shared.mainPoint}</p>
                      
                      {isSelf && (
                        <button
                          type="button"
                          className="primary-button"
                          style={{ padding: '7px 14px', fontSize: '12px', gap: 6 }}
                          onClick={() => {
                            onClose();
                            onAdoptSharedNote?.(shared);
                          }}
                          data-testid={`button-adopt-shared-${shared.id}`}
                        >
                          <Copy size={13} /> Apropriar-se e Editar (Criar minha cópia)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mySentNotes.length > 0 && (
              <div style={{ marginTop: myReceivedNotes.length > 0 ? 12 : 0 }}>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--muted-foreground))', marginBottom: 10, fontWeight: 700 }}>
                  Notas enviadas por {isSelf ? 'você' : profile.authorName}
                </h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  {mySentNotes.map((shared) => (
                    <div className="paper-card" key={shared.id} style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{shared.title}</div>
                        <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>Enviado para @{shared.recipientName}</div>
                      </div>
                      <Send size={14} color="hsl(var(--muted-foreground))" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myReceivedNotes.length === 0 && mySentNotes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'hsl(var(--muted-foreground))', fontSize: '13px' }}>
                Nenhuma anotação enviada ou recebida por este perfil ainda.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Followers List */}
        {activeTab === 'followers' && (
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {realFollowerWriters.length > 0 ? (
              realFollowerWriters.map((writer) => {
                const count = annotations.filter(a => a.published && (a.authorId === writer.authorId || a.authorName === writer.authorName)).length;
                return (
                  <div key={writer.authorId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      {writer.authorPhoto ? (
                        <img src={writer.authorPhoto} alt={writer.authorName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: 15 }}>{writer.authorName[0]}</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{writer.authorName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>{count} {count === 1 ? 'publicação' : 'publicações'}</div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="primary-button" 
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => handleOpenOtherProfile(writer)}
                    >
                      Ver perfil
                    </button>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#667085', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                Nenhum seguidor encontrado para este perfil.
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Following List */}
        {activeTab === 'following' && (
          <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
            {realFollowedWriters.length > 0 ? (
              realFollowedWriters.map((writer) => {
                const count = annotations.filter(a => a.published && (a.authorId === writer.authorId || a.authorName === writer.authorName)).length;
                return (
                  <div key={writer.authorId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      {writer.authorPhoto ? (
                        <img src={writer.authorPhoto} alt={writer.authorName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: 15 }}>{writer.authorName[0]}</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{writer.authorName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))' }}>{count} {count === 1 ? 'publicação' : 'publicações'}</div>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="primary-button" 
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() => handleOpenOtherProfile(writer)}
                    >
                      Ver perfil
                    </button>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#667085', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                Este perfil ainda não está seguindo nenhum escritor.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function VersePreviewModal({ 
  reference, 
  onClose, 
  onOpenBible 
}: { 
  reference: BibleReference; 
  onClose: () => void; 
  onOpenBible: (ref: BibleReference) => void;
}) {
  const verseText = getVerseText(reference);

  return (
    <div 
      className="sheet-backdrop" 
      role="presentation" 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="verse-preview-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c75b3d', fontWeight: 700 }}>
            <BookOpen size={18} />
            <span>{reference.label}</span>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="verse-preview-text">“{verseText}”</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="outline-button" onClick={onClose}>Fechar</button>
          <button type="button" className="primary-button" onClick={() => { onClose(); onOpenBible(reference); }}>
            Ler capítulo completo na Bíblia <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ annotation, onCancel, onConfirm }: { annotation: Annotation; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div 
      className="modal-backdrop" 
      role="presentation" 
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="modal-header">
          <div>
            <div className="eyebrow">apagar página</div>
            <h2 className="modal-title" id="delete-title">Remover esta anotação?</h2>
            <p className="modal-subtitle">“{annotation.title}” será apagada deste dispositivo e não poderá ser recuperada.</p>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Fechar confirmação" data-testid="button-cancel-delete"><X size={18} /></button>
        </div>
        <div className="modal-footer">
          <button type="button" className="outline-button" onClick={onCancel} data-testid="button-keep-annotation">Manter página</button>
          <button type="button" className="primary-button danger-button" onClick={onConfirm} data-testid="button-confirm-delete"><Trash2 size={14} /> Apagar anotação</button>
        </div>
      </section>
    </div>
  );
}

function InstagramBottomNav({
  view,
  onNavigate,
  currentUser,
  onOpenProfile,
  isNavVisible = true,
  language = 'pt-BR'
}: {
  view: View;
  onNavigate: (view: View) => void;
  onOpenComposer?: () => void;
  currentUser: FirebaseUser | null;
  onOpenProfile: (author: { authorId: string; authorName: string; authorPhoto?: string }) => void;
  isNavVisible?: boolean;
  language?: Language;
}) {
  const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Meu caderno';

  return (
    <nav className={`floating-glass-menu ${!isNavVisible ? 'nav-hidden' : ''}`} data-testid="floating-bottom-nav">
      <button
        type="button"
        className={`floating-menu-item ${view === 'overview' ? 'active' : ''}`}
        onClick={() => onNavigate('overview')}
        title={t('nav.home', language)}
        data-testid="bottom-nav-overview"
      >
        <Home size={19} />
        <span>{t('nav.home', language)}</span>
      </button>

      <button
        type="button"
        className={`floating-menu-item ${view === 'learn' ? 'active' : ''}`}
        onClick={() => onNavigate('learn')}
        title={t('nav.learn', language)}
        data-testid="bottom-nav-learn"
      >
        <Trophy size={19} />
        <span>{t('nav.learn', language)}</span>
      </button>

      <button
        type="button"
        className={`floating-menu-item ${view === 'notes' ? 'active' : ''}`}
        onClick={() => onNavigate('notes')}
        title={t('nav.notes', language)}
        data-testid="bottom-nav-notes"
      >
        <FileText size={19} />
        <span>{t('nav.notes', language)}</span>
      </button>

      <button
        type="button"
        className={`floating-menu-item ${view === 'feed' ? 'active' : ''}`}
        onClick={() => onNavigate('feed')}
        title={t('nav.feed', language)}
        data-testid="bottom-nav-feed"
      >
        <PenLine size={19} />
        <span>{t('nav.feed', language)}</span>
      </button>

      <button
        type="button"
        className={`floating-menu-item ${view === 'profiles' ? 'active' : ''}`}
        onClick={() => onNavigate('profiles')}
        title={t('nav.profiles', language)}
        data-testid="bottom-nav-profiles"
      >
        <Users size={19} />
        <span>{t('nav.profiles', language)}</span>
      </button>

      <button
        type="button"
        className="floating-menu-item"
        onClick={() => {
          if (currentUser) {
            onOpenProfile({ authorId: currentUser.uid, authorName: name, authorPhoto: currentUser.photoURL || undefined });
          } else {
            onNavigate('profiles');
          }
        }}
        title={t('nav.profile', language)}
        data-testid="bottom-nav-profile"
      >
        {currentUser?.photoURL ? (
          <img src={currentUser.photoURL} alt={name} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <User size={19} />
        )}
        <span>{t('nav.profile', language)}</span>
      </button>
    </nav>
  );
}

export default App;