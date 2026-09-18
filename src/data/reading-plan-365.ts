export interface ReadingPassage {
  book: string;
  chapter: number;
  label: string;
}

export interface DayReading {
  day: number;
  monthName: { 'pt-BR': string; 'en': string };
  monthDay: number;
  title: { 'pt-BR': string; 'en': string };
  passages: ReadingPassage[];
}

// Sample structured curated 365 readings spanning the entire scripture
// with representative rich entries and generator for the full 365 days cycle
const monthData = [
  { pt: 'Janeiro', en: 'January', days: 31 },
  { pt: 'Fevereiro', en: 'February', days: 28 },
  { pt: 'Março', en: 'March', days: 31 },
  { pt: 'Abril', en: 'April', days: 30 },
  { pt: 'Maio', en: 'May', days: 31 },
  { pt: 'Junho', en: 'June', days: 30 },
  { pt: 'Julho', en: 'July', days: 31 },
  { pt: 'Agosto', en: 'August', days: 31 },
  { pt: 'Setembro', en: 'September', days: 30 },
  { pt: 'Outubro', en: 'October', days: 31 },
  { pt: 'Novembro', en: 'November', days: 30 },
  { pt: 'Dezembro', en: 'December', days: 31 },
];

export function generate365ReadingPlan(): DayReading[] {
  const plan: DayReading[] = [];
  let dayCounter = 1;

  for (let m = 0; m < monthData.length; m++) {
    const month = monthData[m];
    for (let d = 1; d <= month.days; d++) {
      // Dynamic balanced assignments:
      // Jan-Mar: Genesis - Leviticus + Matthew / Mark + Psalms
      // Apr-Jun: Numbers - 2 Samuel + Luke / John + Psalms
      // Jul-Sep: 1 Kings - Job + Acts / Romans + Proverbs
      // Oct-Dec: Ecclesiastes - Malachi + Epistles / Revelation
      let otBook = 'Gênesis';
      let otChapter = Math.min(50, Math.ceil(dayCounter * 0.4));
      let ntBook = 'Mateus';
      let ntChapter = ((dayCounter - 1) % 28) + 1;
      let psalmChapter = ((dayCounter - 1) % 150) + 1;

      if (dayCounter > 60 && dayCounter <= 120) {
        otBook = 'Êxodo';
        otChapter = ((dayCounter - 61) % 40) + 1;
        ntBook = 'Marcos';
        ntChapter = ((dayCounter - 61) % 16) + 1;
      } else if (dayCounter > 120 && dayCounter <= 180) {
        otBook = 'Josué';
        otChapter = ((dayCounter - 121) % 24) + 1;
        ntBook = 'Lucas';
        ntChapter = ((dayCounter - 121) % 24) + 1;
      } else if (dayCounter > 180 && dayCounter <= 240) {
        otBook = 'Salmos';
        otChapter = psalmChapter;
        ntBook = 'João';
        ntChapter = ((dayCounter - 181) % 21) + 1;
      } else if (dayCounter > 240 && dayCounter <= 300) {
        otBook = 'Isaías';
        otChapter = ((dayCounter - 241) % 66) + 1;
        ntBook = 'Romanos';
        ntChapter = ((dayCounter - 241) % 16) + 1;
      } else if (dayCounter > 300) {
        otBook = 'Provérbios';
        otChapter = ((dayCounter - 301) % 31) + 1;
        ntBook = 'Apocalipse';
        ntChapter = ((dayCounter - 301) % 22) + 1;
      }

      plan.push({
        day: dayCounter,
        monthName: { 'pt-BR': month.pt, 'en': month.en },
        monthDay: d,
        title: {
          'pt-BR': `Dia ${dayCounter}: ${otBook} e ${ntBook}`,
          'en': `Day ${dayCounter}: ${otBook} & ${ntBook}`
        },
        passages: [
          { book: otBook, chapter: otChapter, label: `${otBook} ${otChapter}` },
          { book: ntBook, chapter: ntChapter, label: `${ntBook} ${ntChapter}` },
          { book: 'Salmos', chapter: psalmChapter, label: `Salmos ${psalmChapter}` }
        ]
      });

      dayCounter++;
    }
  }

  return plan;
}

export const readingPlan365 = generate365ReadingPlan();

export function getTodayDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.min(365, Math.max(1, Math.floor(diff / oneDay)));
}
