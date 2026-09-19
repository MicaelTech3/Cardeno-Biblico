import React, { useState } from 'react';
import {
  X,
  Edit3,
  BookOpen,
  Sparkles,
  Link2,
  Lock,
  ShieldCheck,
  ArrowRight,
  Maximize2,
  Calendar,
  Compass,
  CheckCircle2,
  Quote,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import type { FirebaseUser } from '@/lib/firebase';

export type ColorName = 'navy' | 'terracotta' | 'sage' | 'gold' | 'plum';
export type AnnotationStatus = 'draft' | 'finalized';

export type BibleReference = {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  label: string;
};

export type Annotation = {
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
};

interface InvestigationBoardModalProps {
  annotation: Annotation;
  annotations: Annotation[];
  currentUser: FirebaseUser | null;
  onClose: () => void;
  onEdit: (annotation: Annotation) => void;
  onReference: (reference: BibleReference) => void;
  onSelectAnnotation: (annotation: Annotation) => void;
}

const sampleScriptures: Record<string, string> = {
  'João 3:16': 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
  'Romanos 8:1': 'Portanto, agora nenhuma condenação há para os que estão em Cristo Jesus, que não andam segundo a carne, mas segundo o Espírito.',
  'Salmos 23:1': 'O Senhor é o meu pastor; nada me faltará.',
  'Salmos 23:4': 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás comigo; a tua vara e o teu cajado me consolam.',
  'Filipenses 4:6': 'Não andeis ansiosos por coisa alguma; antes, em tudo sejam os vossos pedidos conhecidos diante de Deus pela oração e súplica com ações de graças.',
  'Mateus 5:5': 'Bem-aventurados os mansos, porque eles herdarão a terra.',
  '1 João 4:19': 'Nós o amamos a ele porque ele nos amou primeiro.'
};

export function InvestigationBoardModal({
  annotation,
  annotations,
  currentUser,
  onClose,
  onEdit,
  onReference,
  onSelectAnnotation
}: InvestigationBoardModalProps) {
  const currentUid = currentUser?.uid || 'guest';
  const isOwner = annotation.authorId
    ? annotation.authorId === currentUid
    : currentUid === 'guest' || annotation.authorName === 'Meu caderno';

  // Find all connected notes
  const connectedNotes = (annotation.linkedAnnotationIds || [])
    .map((id) => annotations.find((a) => a.id === id))
    .filter((a): a is Annotation => Boolean(a));

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(annotation.updatedAt || annotation.createdAt || new Date()));

  return (
    <div
      className="investigation-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="investigation-board-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="investigation-board">
        {/* Corkboard / Detective Wall Header */}
        <header className="investigation-header">
          <div className="investigation-title-group">
            <div className="investigation-kicker">
              <span className="thumbtack-dot red" />
              <span>Quadro Investigativo de Estudo · Mural de Conexões</span>
            </div>
            <h2 id="investigation-board-title" className="investigation-main-title">
              {annotation.title || 'Anotação sem título'}
            </h2>
            <div className="investigation-meta-row">
              <div className="investigation-author-chip">
                {annotation.authorPhoto ? (
                  <img src={annotation.authorPhoto} alt={annotation.authorName} className="author-thumb" />
                ) : (
                  <span className="author-thumb-placeholder">{annotation.authorInitial || 'M'}</span>
                )}
                <span>Mapeado por <strong>@{annotation.authorName}</strong></span>
              </div>
              <span className="investigation-date">Atualizado em {formattedDate}</span>
              {annotation.published ? (
                <span className="status-badge published">🌐 Público</span>
              ) : (
                <span className="status-badge draft">🔒 Privado</span>
              )}
            </div>
          </div>

          <div className="investigation-header-actions">
            {isOwner ? (
              <div className="creator-badge-wrap">
                <span className="creator-permission-pill is-creator" title="Você é o criador desta anotação">
                  <ShieldCheck size={14} /> Você é o autor
                </span>
                <button
                  type="button"
                  className="primary-button edit-board-btn"
                  onClick={() => onEdit(annotation)}
                  title="Editar notas, frases, versículos e conectar novas páginas"
                  data-testid="button-edit-investigation-board"
                >
                  <Edit3 size={15} /> Editar Estudo e Conexões
                </button>
              </div>
            ) : (
              <div className="creator-badge-wrap">
                <span className="creator-permission-pill is-viewer" title="Apenas o autor pode fazer alterações neste estudo">
                  <Lock size={14} /> Modo de Leitura (Criador: @{annotation.authorName})
                </span>
              </div>
            )}

            <button
              type="button"
              className="icon-button close-board-btn"
              onClick={onClose}
              aria-label="Fechar quadro de investigação"
              title="Fechar mural"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Investigative Notice Ribbon */}
        <div className="investigation-banner">
          <div className="banner-yarn-icon">🧵</div>
          <div className="banner-text">
            <strong>Mural da Loucura & Conexões Bíblicas:</strong> Todos os caminhos, pistas bíblicas e páginas interligadas por fios vermelhos para aprofundamento do texto sagrado.
            {!isOwner && ' Você está explorando as conexões deste autor.'}
          </div>
        </div>

        {/* Board Canvas with String Connectors and Pinned Cards */}
        <div className="investigation-canvas">
          {/* Column 1: Pinned Scriptures / Versículos Investigados */}
          <div className="board-column scriptures-column">
            <div className="column-label">
              <span className="thumbtack-dot gold" />
              <span>Escrituras & Versículos ({annotation.references.length})</span>
            </div>

            <div className="column-cards-stack">
              {annotation.references.length > 0 ? (
                annotation.references.map((ref, idx) => {
                  const verseSnippet = sampleScriptures[ref.label] ||
                    `Passagem de ${ref.label}. Consulte o texto sagrado diretamente no leitor para contexto completo.`;

                  return (
                    <div className="pinned-card scripture-card" key={ref.id || `ref-${idx}`}>
                      <div className="pin-head gold" />
                      <div className="card-top-tag">
                        <BookOpen size={13} />
                        <strong>{ref.label}</strong>
                      </div>
                      <p className="scripture-verse-text">
                        "{verseSnippet}"
                      </p>
                      <button
                        type="button"
                        className="open-scripture-btn"
                        onClick={() => onReference(ref)}
                        title={`Abrir ${ref.label} na Bíblia`}
                      >
                        <span>Consultar capítulo</span>
                        <ExternalLink size={12} />
                      </button>
                      <div className="yarn-anchor left-anchor" />
                    </div>
                  );
                })
              ) : (
                <div className="empty-pinned-card">
                  <div className="pin-head grey" />
                  <p>Nenhuma passagem bíblica anexada a este estudo.</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Central Investigated Study (A Pista Principal) */}
          <div className="board-column central-column">
            <div className="column-label highlight">
              <span className="thumbtack-dot red" />
              <span>Anotação Central · Núcleo da Investigação</span>
            </div>

            <div className={`pinned-card main-investigation-card ${annotation.color || 'terracotta'}`}>
              <div className="pin-head big-red" />
              <div className="card-yarn-junction">
                <span className="yarn-line to-left" />
                <span className="yarn-line to-right" />
              </div>

              <div className="central-card-header">
                <div className="central-card-eyebrow">PENSAMENTO PRINCIPAL</div>
                <h3 className="central-card-title">{annotation.title || 'Anotação sem título'}</h3>
              </div>

              <div className="central-card-body">
                <p className="central-card-point">{annotation.mainPoint || 'Nenhum texto principal registrado.'}</p>
              </div>

              {/* Highlighted Phrases / Pistas */}
              {annotation.phrases.length > 0 && (
                <div className="central-phrases-zone">
                  <div className="zone-title">
                    <Quote size={13} />
                    <span>Pistas & Frases Destacadas</span>
                  </div>
                  <div className="phrases-grid">
                    {annotation.phrases.map((phrase, idx) => (
                      <div className="pinned-sticky-note" key={`phrase-${idx}`}>
                        <div className="tape-strip" />
                        <p>"{phrase}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {annotation.tags.length > 0 && (
                <div className="central-tags-row">
                  {annotation.tags.map((tag) => (
                    <span className="board-tag-pill" key={tag}>#{tag}</span>
                  ))}
                </div>
              )}

              <div className="central-card-footer">
                <div className="author-sign">
                  Registrado no caderno de <strong>{annotation.authorName}</strong>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    className="outline-button quick-edit-btn"
                    onClick={() => onEdit(annotation)}
                  >
                    <Edit3 size={13} /> Editar nota
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Connected Pages & Paths (Outros Blocos e Conexões) */}
          <div className="board-column connections-column">
            <div className="column-label">
              <span className="thumbtack-dot red" />
              <span>Caminhos & Páginas Vinculadas ({connectedNotes.length})</span>
            </div>

            <div className="column-cards-stack">
              {connectedNotes.length > 0 ? (
                connectedNotes.map((conn) => (
                  <div
                    className={`pinned-card connected-note-card ${conn.color || 'terracotta'}`}
                    key={conn.id}
                    onClick={() => onSelectAnnotation(conn)}
                    title={`Clique para navegar e investigar o mural de "${conn.title}"`}
                  >
                    <div className="pin-head red" />
                    <div className="yarn-anchor right-anchor" />
                    
                    <div className="connected-card-header">
                      <span className="thread-indicator">🧵 Fio Conectado</span>
                      <span className="connected-author">@{conn.authorName}</span>
                    </div>

                    <h4 className="connected-note-title">{conn.title || 'Anotação vinculada'}</h4>
                    <p className="connected-note-snippet">{conn.mainPoint || 'Clique para ver o estudo completo.'}</p>

                    <div className="connected-card-footer">
                      <span className="inspect-link">
                        Investigar este bloco <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-pinned-card">
                  <div className="pin-head grey" />
                  <p>
                    {isOwner
                      ? 'Nenhum outro bloco vinculado ainda. Clique em "Editar Estudo e Conexões" para passar os fios vermelhos e ligar com outras anotações do seu caderno!'
                      : 'O criador ainda não conectou outros blocos a este estudo.'}
                  </p>
                  {isOwner && (
                    <button
                      type="button"
                      className="primary-button"
                      style={{ marginTop: 12, padding: '8px 14px', fontSize: '0.8rem' }}
                      onClick={() => onEdit(annotation)}
                    >
                      <Link2 size={13} /> Conectar outras páginas
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
