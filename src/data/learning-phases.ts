export type QuestionType = 'quiz' | 'fill_gap' | 'order_verse' | 'true_false';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: { 'pt-BR': string; 'en': string };
  verseRef: string;
  explanation: { 'pt-BR': string; 'en': string };
}

export interface QuizQuestion extends BaseQuestion {
  type: 'quiz';
  options: Array<{ 'pt-BR': string; 'en': string }>;
  correctIndex: number;
}

export interface FillGapQuestion extends BaseQuestion {
  type: 'fill_gap';
  sentenceWithBlank: { 'pt-BR': string; 'en': string }; // e.g. "Porque Deus amou o ___ de tal maneira"
  blankWord: { 'pt-BR': string; 'en': string };
  wordBank: Array<{ 'pt-BR': string; 'en': string }>;
}

export interface OrderVerseQuestion extends BaseQuestion {
  type: 'order_verse';
  orderedWords: { 'pt-BR': string[]; 'en': string[] };
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  statement: { 'pt-BR': string; 'en': string };
  isTrue: boolean;
}

export type LearningQuestion = QuizQuestion | FillGapQuestion | OrderVerseQuestion | TrueFalseQuestion;

export interface LearningPhase {
  id: string;
  number: number;
  title: { 'pt-BR': string; 'en': string };
  subtitle: { 'pt-BR': string; 'en': string };
  iconName: string; // 'Sun' | 'Shield' | 'Scroll' | 'Heart' | 'Crown' | 'Cross' | 'Flame' | 'Star'
  themeColor: string;
  xpReward: number;
  bookReference: string;
  chapter: number;
  questions: LearningQuestion[];
}

export const learningPhases: LearningPhase[] = [
  {
    id: 'phase-1',
    number: 1,
    title: {
      'pt-BR': 'A Criação e o Começo',
      'en': 'The Creation & The Beginning'
    },
    subtitle: {
      'pt-BR': 'Gênesis 1 - O sopro de vida e a luz',
      'en': 'Genesis 1 - The breath of life and the light'
    },
    iconName: 'Sun',
    themeColor: '#D97706',
    xpReward: 35,
    bookReference: 'Gênesis',
    chapter: 1,
    questions: [
      {
        id: 'p1-q1',
        type: 'quiz',
        prompt: {
          'pt-BR': 'O que Deus disse no primeiro dia da Criação ao trazer ordem ao caos?',
          'en': 'What did God say on the first day of Creation when bringing order to chaos?'
        },
        options: [
          { 'pt-BR': 'Haja Luz', 'en': 'Let there be light' },
          { 'pt-BR': 'Haja Vida', 'en': 'Let there be life' },
          { 'pt-BR': 'Haja Paz', 'en': 'Let there be peace' },
          { 'pt-BR': 'Hajam Estrelas', 'en': 'Let there be stars' }
        ],
        correctIndex: 0,
        verseRef: 'Gênesis 1:3',
        explanation: {
          'pt-BR': 'Deus disse: "Haja luz", e houve luz. A Palavra de Deus tem poder de criar e iluminar.',
          'en': 'God said: "Let there be light", and there was light. God\'s Word has the power to create and illuminate.'
        }
      },
      {
        id: 'p1-q2',
        type: 'fill_gap',
        prompt: {
          'pt-BR': 'Complete o versículo da criação humana:',
          'en': 'Complete the verse about human creation:'
        },
        sentenceWithBlank: {
          'pt-BR': 'Criou Deus o homem à sua ___; à imagem de Deus o criou.',
          'en': 'So God created mankind in his own ___; in the image of God he created them.'
        },
        blankWord: {
          'pt-BR': 'imagem',
          'en': 'image'
        },
        wordBank: [
          { 'pt-BR': 'imagem', 'en': 'image' },
          { 'pt-BR': 'força', 'en': 'strength' },
          { 'pt-BR': 'terra', 'en': 'earth' },
          { 'pt-BR': 'vontade', 'en': 'will' }
        ],
        verseRef: 'Gênesis 1:27',
        explanation: {
          'pt-BR': 'Todo ser humano foi criado à imagem e semelhança do Criador com dignidade e propósito.',
          'en': 'Every human was made in the image and likeness of the Creator with dignity and purpose.'
        }
      },
      {
        id: 'p1-q3',
        type: 'order_verse',
        prompt: {
          'pt-BR': 'Ordene as primeiras palavras das Sagradas Escrituras:',
          'en': 'Put the very first words of the Holy Scriptures in order:'
        },
        orderedWords: {
          'pt-BR': ['No', 'princípio', 'criou', 'Deus', 'os', 'céus', 'e', 'a', 'terra'],
          'en': ['In', 'the', 'beginning', 'God', 'created', 'the', 'heavens', 'and', 'the', 'earth']
        },
        verseRef: 'Gênesis 1:1',
        explanation: {
          'pt-BR': 'Gênesis 1:1 estabelece que antes de todas as coisas, Deus já existia como o Autor Soberano.',
          'en': 'Genesis 1:1 establishes that before all things, God already existed as the Sovereign Author.'
        }
      }
    ]
  },
  {
    id: 'phase-2',
    number: 2,
    title: {
      'pt-BR': 'A Aliança e a Fé',
      'en': 'The Covenant & Faith'
    },
    subtitle: {
      'pt-BR': 'Gênesis 12 & 15 - Abraão e a promessa',
      'en': 'Genesis 12 & 15 - Abraham and the promise'
    },
    iconName: 'Star',
    themeColor: '#4F46E5',
    xpReward: 40,
    bookReference: 'Gênesis',
    chapter: 12,
    questions: [
      {
        id: 'p2-q1',
        type: 'quiz',
        prompt: {
          'pt-BR': 'A que Deus comparou a futura descendência de Abraão quando pediu para ele olhar para o alto?',
          'en': 'What did God compare Abraham\'s future offspring to when asking him to look up?'
        },
        options: [
          { 'pt-BR': 'Às estrelas do céu', 'en': 'To the stars in the sky' },
          { 'pt-BR': 'Às montanhas da terra', 'en': 'To the mountains of earth' },
          { 'pt-BR': 'Aos peixes do mar', 'en': 'To the fish of the sea' },
          { 'pt-BR': 'Às nuvens no horizonte', 'en': 'To the clouds on the horizon' }
        ],
        correctIndex: 0,
        verseRef: 'Gênesis 15:5',
        explanation: {
          'pt-BR': 'Deus levou Abrão para fora e disse: "Olha para o céu e conta as estrelas... assim será a tua descendência".',
          'en': 'God took Abram outside and said: "Look up at the sky and count the stars... So shall your offspring be."'
        }
      },
      {
        id: 'p2-q2',
        type: 'fill_gap',
        prompt: {
          'pt-BR': 'Complete o versículo fundamental da justificação:',
          'en': 'Complete the foundational verse on righteousness:'
        },
        sentenceWithBlank: {
          'pt-BR': 'E creu Abrão no Senhor, e isso lhe foi creditado como ___.',
          'en': 'Abram believed the Lord, and he credited it to him as ___.'
        },
        blankWord: {
          'pt-BR': 'justiça',
          'en': 'righteousness'
        },
        wordBank: [
          { 'pt-BR': 'justiça', 'en': 'righteousness' },
          { 'pt-BR': 'riqueza', 'en': 'wealth' },
          { 'pt-BR': 'sabedoria', 'en': 'wisdom' },
          { 'pt-BR': 'poder', 'en': 'power' }
        ],
        verseRef: 'Gênesis 15:6',
        explanation: {
          'pt-BR': 'A fé sincera em Deus é a chave que nos conecta com Sua justiça e graça.',
          'en': 'Genuine faith in God is the key connecting us to His righteousness and grace.'
        }
      }
    ]
  },
  {
    id: 'phase-3',
    number: 3,
    title: {
      'pt-BR': 'Refúgio e Confiança',
      'en': 'Refuge & Trust'
    },
    subtitle: {
      'pt-BR': 'Salmos 23 - O Bom Pastor cuida de nós',
      'en': 'Psalm 23 - The Good Shepherd cares for us'
    },
    iconName: 'Shield',
    themeColor: '#059669',
    xpReward: 45,
    bookReference: 'Salmos',
    chapter: 23,
    questions: [
      {
        id: 'p3-q1',
        type: 'order_verse',
        prompt: {
          'pt-BR': 'Ordene o versículo mais conhecido da Bíblia sobre confiança:',
          'en': 'Put the most beloved verse of trust in order:'
        },
        orderedWords: {
          'pt-BR': ['O', 'Senhor', 'é', 'o', 'meu', 'pastor;', 'nada', 'me', 'faltará'],
          'en': ['The', 'Lord', 'is', 'my', 'shepherd;', 'I', 'shall', 'not', 'want']
        },
        verseRef: 'Salmos 23:1',
        explanation: {
          'pt-BR': 'Davi declara que com o Senhor como nosso Pastor, temos suficiência e cuidado em todas as estações.',
          'en': 'David declares that with the Lord as our Shepherd, we find contentment and care in all seasons.'
        }
      },
      {
        id: 'p3-q2',
        type: 'fill_gap',
        prompt: {
          'pt-BR': 'Complete a passagem de consolo em tempos difíceis:',
          'en': 'Complete the comforting promise for difficult times:'
        },
        sentenceWithBlank: {
          'pt-BR': 'Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum, porque tu estás ___.',
          'en': 'Even though I walk through the darkest valley, I will fear no evil, for you are ___ me.'
        },
        blankWord: {
          'pt-BR': 'comigo',
          'en': 'with'
        },
        wordBank: [
          { 'pt-BR': 'comigo', 'en': 'with' },
          { 'pt-BR': 'longe', 'en': 'away' },
          { 'pt-BR': 'acima', 'en': 'above' },
          { 'pt-BR': 'em silêncio', 'en': 'silent' }
        ],
        verseRef: 'Salmos 23:4',
        explanation: {
          'pt-BR': 'A presença de Deus conosco é o antídoto contra todo medo e solidão.',
          'en': 'God\'s abiding presence with us is the antidote to all fear and loneliness.'
        }
      }
    ]
  },
  {
    id: 'phase-4',
    number: 4,
    title: {
      'pt-BR': 'O Coração da Sabedoria',
      'en': 'The Heart of Wisdom'
    },
    subtitle: {
      'pt-BR': 'Provérbios 3 - Confiança de todo o coração',
      'en': 'Proverbs 3 - Trust with all your heart'
    },
    iconName: 'Crown',
    themeColor: '#EA580C',
    xpReward: 45,
    bookReference: 'Provérbios',
    chapter: 3,
    questions: [
      {
        id: 'p4-q1',
        type: 'quiz',
        prompt: {
          'pt-BR': 'Segundo Provérbios 9:10, qual é o princípio da sabedoria?',
          'en': 'According to Proverbs 9:10, what is the beginning of wisdom?'
        },
        options: [
          { 'pt-BR': 'O temor do Senhor', 'en': 'The fear of the Lord' },
          { 'pt-BR': 'A leitura de muitos livros', 'en': 'Reading many books' },
          { 'pt-BR': 'A experiência dos anos', 'en': 'The experience of years' },
          { 'pt-BR': 'A força física', 'en': 'Physical strength' }
        ],
        correctIndex: 0,
        verseRef: 'Provérbios 9:10',
        explanation: {
          'pt-BR': 'Temer ao Senhor não é ter pavor, mas reverenciá-Lo com respeito amoroso e submissão.',
          'en': 'Fearing the Lord is not terror, but revering Him with loving respect and trust.'
        }
      },
      {
        id: 'p4-q2',
        type: 'fill_gap',
        prompt: {
          'pt-BR': 'Complete o conselho de Provérbios 3:5:',
          'en': 'Complete the counsel of Proverbs 3:5:'
        },
        sentenceWithBlank: {
          'pt-BR': 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio ___.',
          'en': 'Trust in the Lord with all your heart and lean not on your own ___.'
        },
        blankWord: {
          'pt-BR': 'entendimento',
          'en': 'understanding'
        },
        wordBank: [
          { 'pt-BR': 'entendimento', 'en': 'understanding' },
          { 'pt-BR': 'caminho', 'en': 'path' },
          { 'pt-BR': 'trabalho', 'en': 'work' },
          { 'pt-BR': 'tesouro', 'en': 'treasure' }
        ],
        verseRef: 'Provérbios 3:5',
        explanation: {
          'pt-BR': 'Nossa mente finita encontra paz quando repousa na sabedoria infinita de Deus.',
          'en': 'Our finite mind finds true rest when trusting in God\'s infinite wisdom.'
        }
      }
    ]
  },
  {
    id: 'phase-5',
    number: 5,
    title: {
      'pt-BR': 'O Maior Amor do Mundo',
      'en': 'The Greatest Love'
    },
    subtitle: {
      'pt-BR': 'João 3 - O envio do Filho unigênito',
      'en': 'John 3 - The sending of the only Son'
    },
    iconName: 'Heart',
    themeColor: '#DC2626',
    xpReward: 50,
    bookReference: 'João',
    chapter: 3,
    questions: [
      {
        id: 'p5-q1',
        type: 'order_verse',
        prompt: {
          'pt-BR': 'Ordene o versículo mais precioso do Evangelho de João:',
          'en': 'Put the most beloved verse of the Gospel of John in order:'
        },
        orderedWords: {
          'pt-BR': ['Porque', 'Deus', 'amou', 'o', 'mundo', 'de', 'tal', 'maneira', 'que', 'deu', 'o', 'seu', 'Filho'],
          'en': ['For', 'God', 'so', 'loved', 'the', 'world', 'that', 'he', 'gave', 'his', 'only', 'begotten', 'Son']
        },
        verseRef: 'João 3:16',
        explanation: {
          'pt-BR': 'João 3:16 resume o coração de Deus: um amor tão profundo que deu o Seu melhor por nós.',
          'en': 'John 3:16 sums up the heart of God: love so immense that He gave His very best for us.'
        }
      },
      {
        id: 'p5-q2',
        type: 'quiz',
        prompt: {
          'pt-BR': 'Qual foi a razão pela qual Deus enviou Seu Filho ao mundo (João 3:17)?',
          'en': 'Why did God send His Son into the world according to John 3:17?'
        },
        options: [
          { 'pt-BR': 'Para que o mundo fosse salvo por Ele', 'en': 'That the world through Him might be saved' },
          { 'pt-BR': 'Para condenar os pecadores', 'en': 'To condemn sinners' },
          { 'pt-BR': 'Para estabelecer um império político', 'en': 'To build a worldly empire' },
          { 'pt-BR': 'Para punir os desobedientes', 'en': 'To punish the disobedient' }
        ],
        correctIndex: 0,
        verseRef: 'João 3:17',
        explanation: {
          'pt-BR': 'Jesus veio com o propósito de resgatar e salvar, estendendo a mão da misericórdia.',
          'en': 'Jesus came to rescue and save, holding out the hand of mercy.'
        }
      }
    ]
  },
  {
    id: 'phase-6',
    number: 6,
    title: {
      'pt-BR': 'A Vitória da Cruz',
      'en': 'The Victory of the Cross'
    },
    subtitle: {
      'pt-BR': 'Romanos 8 - Nenhuma condenação há',
      'en': 'Romans 8 - There is now no condemnation'
    },
    iconName: 'Cross',
    themeColor: '#7C3AED',
    xpReward: 55,
    bookReference: 'Romanos',
    chapter: 8,
    questions: [
      {
        id: 'p6-q1',
        type: 'fill_gap',
        prompt: {
          'pt-BR': 'Complete o início glorioso de Romanos 8:',
          'en': 'Complete the triumphant beginning of Romans 8:'
        },
        sentenceWithBlank: {
          'pt-BR': 'Portanto, agora nenhuma ___ há para os que estão em Cristo Jesus.',
          'en': 'Therefore, there is now no ___ for those who are in Christ Jesus.'
        },
        blankWord: {
          'pt-BR': 'condenação',
          'en': 'condemnation'
        },
        wordBank: [
          { 'pt-BR': 'condenação', 'en': 'condemnation' },
          { 'pt-BR': 'dúvida', 'en': 'doubt' },
          { 'pt-BR': 'tristeza', 'en': 'sorrow' },
          { 'pt-BR': 'fraqueza', 'en': 'weakness' }
        ],
        verseRef: 'Romanos 8:1',
        explanation: {
          'pt-BR': 'A obra de Cristo na cruz cancelou toda culpa e nos concedeu vida e paz eterna.',
          'en': 'Christ\'s work on the cross cancelled all guilt and granted us eternal life and peace.'
        }
      },
      {
        id: 'p6-q2',
        type: 'quiz',
        prompt: {
          'pt-BR': 'O que pode nos separar do amor de Deus que está em Cristo Jesus (Romanos 8:38-39)?',
          'en': 'What can separate us from the love of God in Christ Jesus (Romans 8:38-39)?'
        },
        options: [
          { 'pt-BR': 'Absolutamente nada', 'en': 'Absolutely nothing' },
          { 'pt-BR': 'Apenas a morte', 'en': 'Only death' },
          { 'pt-BR': 'As dificuldades financeiras', 'en': 'Financial distress' },
          { 'pt-BR': 'Os inimigos humanos', 'en': 'Human enemies' }
        ],
        correctIndex: 0,
        verseRef: 'Romanos 8:38-39',
        explanation: {
          'pt-BR': 'Nem morte, nem vida, nem anjos nem principados... nada é capaz de nos afastar do amor de Deus!',
          'en': 'Neither death nor life, neither angels nor rulers... nothing can separate us from God\'s love!'
        }
      }
    ]
  }
];
