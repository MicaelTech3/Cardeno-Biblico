import React, { useState } from 'react';
import { 
  X, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  BookOpen, 
  ArrowRight, 
  RotateCcw 
} from 'lucide-react';
import { LearningPhase, LearningQuestion } from '../data/learning-phases';
import { Language, t } from '../i18n';

interface LessonModalProps {
  phase: LearningPhase;
  language: Language;
  currentHearts: number;
  onComplete: (xpEarned: number, heartsLost: number) => void;
  onLoseHeart: () => void;
  onClose: () => void;
  onOpenReader?: (book: string, chapter: number) => void;
}

export function LessonModal({
  phase,
  language,
  currentHearts,
  onComplete,
  onLoseHeart,
  onClose,
  onOpenReader
}: LessonModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [selectedTrueFalse, setSelectedTrueFalse] = useState<boolean | null>(null);

  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [heartsLostCount, setHeartsLostCount] = useState(0);
  const [isOutOfHearts, setIsOutOfHearts] = useState(false);

  const questions = phase.questions;
  const currentQuestion: LearningQuestion = questions[currentIdx];

  const handleSelectWordInBank = (word: string) => {
    if (hasChecked) return;
    if (currentQuestion.type === 'fill_gap') {
      setSelectedWord(word);
    } else if (currentQuestion.type === 'order_verse') {
      setOrderedWords((prev) => [...prev, word]);
    }
  };

  const handleRemoveOrderedWord = (index: number) => {
    if (hasChecked) return;
    setOrderedWords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheck = () => {
    if (hasChecked) return;

    let correct = false;

    if (currentQuestion.type === 'quiz') {
      correct = selectedOption === currentQuestion.correctIndex;
    } else if (currentQuestion.type === 'fill_gap') {
      const correctWord = currentQuestion.blankWord[language];
      correct = selectedWord?.toLowerCase().trim() === correctWord.toLowerCase().trim();
    } else if (currentQuestion.type === 'order_verse') {
      const target = currentQuestion.orderedWords[language];
      correct = orderedWords.length === target.length && orderedWords.every((w, i) => w === target[i]);
    } else if (currentQuestion.type === 'true_false') {
      correct = selectedTrueFalse === currentQuestion.isTrue;
    }

    setIsCorrect(correct);
    setHasChecked(true);

    if (!correct) {
      onLoseHeart();
      setHeartsLostCount((prev) => prev + 1);
      if (currentHearts - 1 <= 0) {
        setIsOutOfHearts(true);
      }
    }
  };

  const handleContinue = () => {
    if (isOutOfHearts) {
      return;
    }

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setSelectedWord(null);
      setOrderedWords([]);
      setSelectedTrueFalse(null);
      setHasChecked(false);
      setIsCorrect(false);
    } else {
      setIsFinished(true);
      onComplete(phase.xpReward, heartsLostCount);
    }
  };

  const isCheckDisabled = () => {
    if (hasChecked) return false;
    if (currentQuestion.type === 'quiz') return selectedOption === null;
    if (currentQuestion.type === 'fill_gap') return selectedWord === null;
    if (currentQuestion.type === 'order_verse') {
      return orderedWords.length === 0;
    }
    if (currentQuestion.type === 'true_false') return selectedTrueFalse === null;
    return true;
  };

  const progressPercent = Math.round(((currentIdx) / questions.length) * 100);

  // Victory screen
  if (isFinished) {
    return (
      <div className="modal-backdrop" style={{ zIndex: 1300 }}>
        <div className="modal lesson-modal" style={{ maxWidth: 480, textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ display: 'inline-flex', padding: 20, borderRadius: '50%', background: 'hsl(var(--accent) / 0.15)', color: 'hsl(var(--accent))', marginBottom: 16 }}>
            <Trophy size={54} />
          </div>
          <h2 style={{ fontFamily: 'var(--app-font-serif)', fontSize: '1.8rem', margin: '0 0 8px' }}>
            {t('learn.lesson_finished_title', language)}
          </h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.95rem', margin: '0 0 24px' }}>
            {t('learn.lesson_finished_desc', language)}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 28 }}>
            <div style={{ padding: '14px 20px', borderRadius: 16, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', flex: 1 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'hsl(var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Sparkles size={18} /> +{phase.xpReward}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>
                {t('learn.xp_earned', language)}
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderRadius: 16, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', flex: 1 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Heart size={18} fill="currentColor" /> -{heartsLostCount}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 4 }}>
                {t('learn.hearts_lost', language)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {onOpenReader && (
              <button 
                type="button" 
                className="outline-button"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 16px' }}
                onClick={() => {
                  onClose();
                  onOpenReader(phase.bookReference, phase.chapter);
                }}
              >
                <BookOpen size={16} /> {t('learn.open_in_reader', language)} ({phase.bookReference} {phase.chapter})
              </button>
            )}
            <button 
              type="button" 
              className="primary-button" 
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: '1rem' }}
              onClick={onClose}
            >
              {t('learn.back_to_path', language)} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Out of hearts screen
  if (isOutOfHearts) {
    return (
      <div className="modal-backdrop" style={{ zIndex: 1300 }}>
        <div className="modal lesson-modal" style={{ maxWidth: 440, textAlign: 'center', padding: '36px 24px' }}>
          <div style={{ display: 'inline-flex', padding: 20, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', marginBottom: 16 }}>
            <Heart size={54} />
          </div>
          <h2 style={{ fontFamily: 'var(--app-font-serif)', fontSize: '1.6rem', margin: '0 0 8px' }}>
            {t('learn.out_of_hearts', language)}
          </h2>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: '0 0 24px' }}>
            {t('learn.out_of_hearts_desc', language)}
          </p>
          <button 
            type="button" 
            className="primary-button" 
            style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}
            onClick={onClose}
          >
            <RotateCcw size={16} /> {t('learn.back_to_path', language)}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 1300 }}>
      <div className="modal lesson-modal" style={{ maxWidth: 580, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header: Close, Progress bar & Hearts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid hsl(var(--border))' }}>
          <button type="button" className="icon-button" onClick={onClose} title="Fechar lição">
            <X size={18} />
          </button>

          {/* Progress bar */}
          <div style={{ flex: 1, height: 12, background: 'hsl(var(--input))', borderRadius: 999, overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${progressPercent}%`, 
                background: 'hsl(var(--accent))', 
                borderRadius: 999, 
                transition: 'width 0.3s ease' 
              }} 
            />
          </div>

          {/* Hearts count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#EF4444', fontSize: '0.9rem' }}>
            <Heart size={18} fill="currentColor" />
            <span>{currentHearts}</span>
          </div>
        </div>

        {/* Question Area (Scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--accent))', fontWeight: 700, marginBottom: 6 }}>
            {phase.title[language]} · {currentIdx + 1} de {questions.length}
          </div>

          <h3 style={{ fontFamily: 'var(--app-font-serif)', fontSize: '1.25rem', lineHeight: 1.4, margin: '0 0 16px' }}>
            {currentQuestion.prompt[language]}
          </h3>

          {/* QUIZ TYPE */}
          {currentQuestion.type === 'quiz' && (
            <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={hasChecked}
                    onClick={() => setSelectedOption(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 18px',
                      borderRadius: 14,
                      border: isSelected 
                        ? '2px solid hsl(var(--accent))' 
                        : '1.5px solid hsl(var(--border))',
                      background: isSelected 
                        ? 'hsl(var(--accent) / 0.08)' 
                        : 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                      fontSize: '0.95rem',
                      textAlign: 'left',
                      cursor: hasChecked ? 'default' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span 
                      style={{ 
                        width: 28, 
                        height: 28, 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: isSelected ? 'hsl(var(--accent))' : 'hsl(var(--input) / 0.5)',
                        color: isSelected ? '#fff' : 'inherit'
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span style={{ fontWeight: isSelected ? 600 : 400 }}>
                      {option[language]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* FILL GAP TYPE */}
          {currentQuestion.type === 'fill_gap' && (
            <div>
              <div 
                style={{ 
                  padding: 20, 
                  borderRadius: 16, 
                  background: 'hsl(var(--card))', 
                  border: '1.5px solid hsl(var(--border))',
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                  marginBottom: 24,
                  textAlign: 'center'
                }}
              >
                {currentQuestion.sentenceWithBlank[language].split('___').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span
                        style={{
                          display: 'inline-block',
                          minWidth: 100,
                          padding: '3px 12px',
                          margin: '0 6px',
                          borderBottom: '3px solid hsl(var(--accent))',
                          fontWeight: 700,
                          color: 'hsl(var(--accent))',
                          background: selectedWord ? 'hsl(var(--accent) / 0.1)' : 'transparent',
                          borderRadius: 6
                        }}
                      >
                        {selectedWord || '_____'}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))', marginBottom: 8, textAlign: 'center' }}>
                {t('learn.fill_instruction', language)}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                {currentQuestion.wordBank.map((item, idx) => {
                  const word = item[language];
                  const isChosen = selectedWord === word;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={hasChecked}
                      onClick={() => handleSelectWordInBank(word)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 12,
                        border: isChosen ? '2px solid hsl(var(--accent))' : '1.5px solid hsl(var(--border))',
                        background: isChosen ? 'hsl(var(--accent))' : 'hsl(var(--card))',
                        color: isChosen ? '#fff' : 'hsl(var(--foreground))',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        cursor: hasChecked ? 'default' : 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ORDER VERSE TYPE */}
          {currentQuestion.type === 'order_verse' && (
            <div>
              {/* Drop area */}
              <div 
                style={{ 
                  minHeight: 80, 
                  padding: 14, 
                  borderRadius: 16, 
                  background: 'hsl(var(--card))', 
                  border: '2px dashed hsl(var(--accent) / 0.4)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 20
                }}
              >
                {orderedWords.length === 0 && (
                  <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
                    {t('learn.order_instruction', language)}
                  </span>
                )}
                {orderedWords.map((word, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={hasChecked}
                    onClick={() => handleRemoveOrderedWord(idx)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'hsl(var(--accent))',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      border: 0,
                      cursor: hasChecked ? 'default' : 'pointer'
                    }}
                  >
                    {word}
                  </button>
                ))}
              </div>

              {/* Word bank */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {currentQuestion.orderedWords[language]
                  .slice()
                  .sort(() => 0.5 - Math.random()) // shuffle
                  .map((word, idx) => {
                    const isUsed = orderedWords.includes(word);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={hasChecked || isUsed}
                        onClick={() => handleSelectWordInBank(word)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: '1.5px solid hsl(var(--border))',
                          background: isUsed ? 'hsl(var(--muted) / 0.5)' : 'hsl(var(--card))',
                          color: isUsed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          opacity: isUsed ? 0.35 : 1,
                          cursor: isUsed || hasChecked ? 'default' : 'pointer'
                        }}
                      >
                        {word}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer feedback banner or action button */}
        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          {hasChecked ? (
            <div 
              style={{ 
                padding: '16px 18px', 
                borderRadius: 16, 
                background: isCorrect ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: isCorrect ? '1.5px solid #22C55E' : '1.5px solid #EF4444',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '1.05rem', color: isCorrect ? '#16A34A' : '#DC2626' }}>
                  {isCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                  {isCorrect ? t('learn.correct_exclamation', language) : t('learn.wrong_exclamation', language)}
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                  {currentQuestion.verseRef}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--foreground))', opacity: 0.9 }}>
                {currentQuestion.explanation[language]}
              </p>

              <button
                type="button"
                className="primary-button"
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  padding: '10px 16px',
                  background: isCorrect ? '#16A34A' : '#DC2626',
                  marginTop: 4
                }}
                onClick={handleContinue}
              >
                {t('learn.continue', language)} <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={isCheckDisabled()}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: '1rem', opacity: isCheckDisabled() ? 0.45 : 1 }}
              onClick={handleCheck}
            >
              {t('learn.check_answer', language)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
