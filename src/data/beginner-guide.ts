export interface BeginnerStep {
  id: string;
  stepNumber: number;
  book: string;
  chapter: number;
  title: { 'pt-BR': string; 'en': string };
  subtitle: { 'pt-BR': string; 'en': string };
  whyRead: { 'pt-BR': string; 'en': string };
  howToRead: { 'pt-BR': string; 'en': string };
  keyVerse: string;
  keyVerseText: { 'pt-BR': string; 'en': string };
  tag: string;
}

export const beginnerSteps: BeginnerStep[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    book: 'João',
    chapter: 1,
    title: {
      'pt-BR': '1. Evangelho de João',
      'en': '1. Gospel of John'
    },
    subtitle: {
      'pt-BR': 'Conhecendo a pessoa e o coração de Jesus',
      'en': 'Discovering the person and heart of Jesus'
    },
    whyRead: {
      'pt-BR': 'João foi o apóstolo mais próximo de Jesus. Ele não escreveu apenas fatos históricos, mas o significado profundo de quem Cristo é: a Palavra que se fez carne, a Luz do mundo e o Bom Pastor.',
      'en': 'John was the disciple closest to Jesus. He wrote not just historical events, but the profound truth of who Christ is: the Word made flesh, the Light of the world, and the Good Shepherd.'
    },
    howToRead: {
      'pt-BR': 'Leia devagar, prestando atenção em como Jesus trata cada pessoa (a mulher samaritana, Nicodemos, Lázaro). Anote o que aprender sobre Seu amor por você.',
      'en': 'Read slowly, noticing how Jesus treats each individual (the Samaritan woman, Nicodemus, Lazarus). Note down what you learn about His personal love for you.'
    },
    keyVerse: 'João 1:14',
    keyVerseText: {
      'pt-BR': 'E o Verbo se fez carne e habitou entre nós, cheio de graça e de verdade.',
      'en': 'The Word became flesh and made his dwelling among us, full of grace and truth.'
    },
    tag: 'Evangelhos'
  },
  {
    id: 'step-2',
    stepNumber: 2,
    book: 'Marcos',
    chapter: 1,
    title: {
      'pt-BR': '2. Evangelho de Marcos',
      'en': '2. Gospel of Mark'
    },
    subtitle: {
      'pt-BR': 'A vida dinâmica e os milagres de Cristo',
      'en': 'The dynamic life and miracles of Christ'
    },
    whyRead: {
      'pt-BR': 'É o evangelho mais curto e dinâmico. Marcos foca nas ações de Jesus, Seus milagres, autoridade sobre o mal e Seu serviço compassivo pelas multidões.',
      'en': 'It is the most concise and action-packed gospel. Mark focuses on Jesus in action, His miracles, authority over darkness, and compassionate service to people.'
    },
    howToRead: {
      'pt-BR': 'Observe a palavra "logo" ou "imediatamente", que aparece repetidamente. Sinta o ritmo e o poder do Reino de Deus em movimento.',
      'en': 'Notice the word "immediately" recurring throughout. Feel the momentum and power of the Kingdom of God on the move.'
    },
    keyVerse: 'Marcos 10:45',
    keyVerseText: {
      'pt-BR': 'Pois nem mesmo o Filho do homem veio para ser servido, mas para servir e dar a sua vida em resgate por muitos.',
      'en': 'For even the Son of Man did not come to be served, but to serve, and to give his life as a ransom for many.'
    },
    tag: 'Evangelhos'
  },
  {
    id: 'step-3',
    stepNumber: 3,
    book: 'Salmos',
    chapter: 23,
    title: {
      'pt-BR': '3. O Livro dos Salmos',
      'en': '3. The Book of Psalms'
    },
    subtitle: {
      'pt-BR': 'Aprendendo a orar com sinceridade em qualquer situação',
      'en': 'Learning honest prayer in every season of life'
    },
    whyRead: {
      'pt-BR': 'Os Salmos são o hinário e diário de oração da Bíblia. Eles nos ensinam que podemos ser 100% honestos com Deus: em momentos de alegria, choro, medo ou louvor.',
      'en': 'The Psalms are the prayer book of Scripture. They teach us that we can be completely transparent with God: in joy, tears, anxiety, or praise.'
    },
    howToRead: {
      'pt-BR': 'Transforme os versículos na sua própria oração matinal ou noturna. Experimente ler em voz alta em um lugar calmo.',
      'en': 'Turn the verses into your personal morning or evening prayer. Try reading them aloud in a quiet space.'
    },
    keyVerse: 'Salmos 46:1',
    keyVerseText: {
      'pt-BR': 'Deus é o nosso refúgio e a nossa fortaleza, socorro bem presente nas tribulações.',
      'en': 'God is our refuge and strength, an ever-present help in trouble.'
    },
    tag: 'Poesia & Oração'
  },
  {
    id: 'step-4',
    stepNumber: 4,
    book: 'Provérbios',
    chapter: 3,
    title: {
      'pt-BR': '4. Provérbios de Salomão',
      'en': '4. Proverbs of Solomon'
    },
    subtitle: {
      'pt-BR': 'Sabedoria prática para decisões, relacionamentos e trabalho',
      'en': 'Practical wisdom for decisions, relationships, and work'
    },
    whyRead: {
      'pt-BR': 'São 31 capítulos — exatamente um para cada dia do mês! Provérbios ensina como viver bem no mundo real: como falar com sabedoria, cuidar das amizades e do dinheiro.',
      'en': 'There are 31 chapters — one for each day of the month! Proverbs instructs us on real-world living: handling words, finances, and relationships with wisdom.'
    },
    howToRead: {
      'pt-BR': 'Leia um capítulo por dia de acordo com a data de hoje. Escolha um único conselho para praticar ao longo do dia.',
      'en': 'Read one chapter a day matching today\'s calendar date. Pick a single piece of counsel to put into practice today.'
    },
    keyVerse: 'Provérbios 4:23',
    keyVerseText: {
      'pt-BR': 'Sobre tudo o que se deve guardar, guarda o teu coração, porque dele procedem as fontes da vida.',
      'en': 'Above all else, guard your heart, for everything you do flows from it.'
    },
    tag: 'Sabedoria'
  },
  {
    id: 'step-5',
    stepNumber: 5,
    book: 'Romanos',
    chapter: 8,
    title: {
      'pt-BR': '5. Carta aos Romanos',
      'en': '5. Epistle to the Romans'
    },
    subtitle: {
      'pt-BR': 'A essência da graça, do perdão e da nova vida em Cristo',
      'en': 'The essence of grace, forgiveness, and life in the Spirit'
    },
    whyRead: {
      'pt-BR': 'Paulo explica a arquitetura do Evangelho: não somos salvos por nossos méritos ou perfeição, mas pelo amor incondicional e sacrifício de Jesus.',
      'en': 'Paul details the architecture of the Gospel: we are not saved by our works or perfection, but by the unconditional love and sacrifice of Jesus.'
    },
    howToRead: {
      'pt-BR': 'Sublinhe palavras como "graça", "justiça" e "fé". Celebre a segurança que Romanos 8 oferece aos que creem.',
      'en': 'Highlight words like "grace", "righteousness", and "faith". Celebrate the immovable security that Romans 8 offers believers.'
    },
    keyVerse: 'Romanos 8:31',
    keyVerseText: {
      'pt-BR': 'Se Deus é por nós, quem será contra nós?',
      'en': 'If God is for us, who can be against us?'
    },
    tag: 'Doutrina & Graça'
  },
  {
    id: 'step-6',
    stepNumber: 6,
    book: 'Gênesis',
    chapter: 1,
    title: {
      'pt-BR': '6. Gênesis: As Origens',
      'en': '6. Genesis: The Origins'
    },
    subtitle: {
      'pt-BR': 'De onde viemos e o início da aliança de Deus com a humanidade',
      'en': 'Where we come from and God\'s initial covenant with humanity'
    },
    whyRead: {
      'pt-BR': 'Depois de conhecer Jesus, ler o Antigo Testamento ganha uma luz totalmente nova! Gênesis conta a criação, a queda, o dilúvio e a chamada de Abraão.',
      'en': 'Having known Jesus first, reading the Old Testament is illuminated! Genesis narrates the creation, the fall, the flood, and God calling Abraham.'
    },
    howToRead: {
      'pt-BR': 'Note como mesmo quando o ser humano falha, Deus já prepara um plano de redenção e promessas.',
      'en': 'Watch how even when humanity fails, God immediately sets in motion His plan of redemption and promise.'
    },
    keyVerse: 'Gênesis 12:2',
    keyVerseText: {
      'pt-BR': 'Far-te-ei uma grande nação, e te abençoarei, e te engrandecerei o nome; e tu serás uma bênção.',
      'en': 'I will make you into a great nation, and I will bless you; I will make your name great, and you will be a blessing.'
    },
    tag: 'História & Aliança'
  }
];
