import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Sparkles, 
  Heart, 
  Trophy, 
  Lock, 
  CheckCircle2, 
  BookOpen, 
  Compass, 
  Calendar, 
  ArrowRight,
  Sun,
  Shield,
  Crown,
  Cross,
  Star,
  ChevronRight,
  Check,
  Search
} from 'lucide-react';
import { learningPhases, LearningPhase } from '../data/learning-phases';
import { beginnerSteps, BeginnerStep } from '../data/beginner-guide';
import { readingPlan365, getTodayDayOfYear } from '../data/reading-plan-365';
import { LessonModal } from './lesson-modal';
import { Language, t } from '../i18n';

interface UserLearningState {
  unlockedPhaseIds: string[];
  completedPhaseIds: string[];
  totalXp: number;
  streak: number;
  lastActiveDate: string;
  hearts: number;
  completedPlanDays: number[];
}

const STORAGE_KEY = 'cb_learning_progress';

const initialLearningState: UserLearningState = {
  unlockedPhaseIds: ['phase-1'],
  completedPhaseIds: [],
  totalXp: 0,
  streak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  hearts: 5,
  completedPlanDays: []
};

function readLearningState(): UserLearningState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialLearningState;
    const parsed = JSON.parse(raw);

    // Check daily streak
    const today = new Date().toISOString().split('T')[0];
    const lastDate = parsed.lastActiveDate || today;
    
    // Simple streak logic: if yesterday, keep streak; if older than yesterday, reset streak to 1
    const diffDays = Math.floor((new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    let streak = parsed.streak || 1;
    if (diffDays > 1) {
      streak = 1;
    }

    return {
      ...initialLearningState,
      ...parsed,
      streak,
      hearts: parsed.hearts !== undefined ? parsed.hearts : 5
    };
  } catch {
    return initialLearningState;
  }
}

interface BibleLearningViewProps {
  language: Language;
  onOpenReader: (book: string, chapter: number) => void;
}

export function BibleLearningView({ language, onOpenReader }: BibleLearningViewProps) {
  const [activeTab, setActiveTab] = useState<'path' | 'beginner' | 'plan'>('path');
  const [state, setState] = useState<UserLearningState>(readLearningState);
  const [activePhase, setActivePhase] = useState<LearningPhase | null>(null);

  // Month selector for 365 reading plan
  const todayDay = getTodayDayOfYear();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [planSearch, setPlanSearch] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const handleLoseHeart = () => {
    setState((prev) => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1)
    }));
  };

  const handleCompleteLesson = (xpEarned: number) => {
    if (!activePhase) return;
    const phaseId = activePhase.id;
    const nextPhaseIndex = learningPhases.findIndex((p) => p.id === phaseId) + 1;
    const nextPhase = learningPhases[nextPhaseIndex];

    const today = new Date().toISOString().split('T')[0];

    setState((prev) => {
      const completed = Array.from(new Set([...prev.completedPhaseIds, phaseId]));
      const unlocked = nextPhase 
        ? Array.from(new Set([...prev.unlockedPhaseIds, nextPhase.id]))
        : prev.unlockedPhaseIds;

      const isNewDay = prev.lastActiveDate !== today;
      const newStreak = isNewDay ? prev.streak + 1 : prev.streak;

      return {
        ...prev,
        completedPhaseIds: completed,
        unlockedPhaseIds: unlocked,
        totalXp: prev.totalXp + xpEarned,
        streak: newStreak,
        lastActiveDate: today,
        hearts: 5 // Refill on completed lesson
      };
    });
  };

  const togglePlanDay = (day: number) => {
    setState((prev) => {
      const exists = prev.completedPlanDays.includes(day);
      const updated = exists 
        ? prev.completedPlanDays.filter((d) => d !== day)
        : [...prev.completedPlanDays, day];
      
      const xpBonus = !exists ? 10 : 0;

      return {
        ...prev,
        completedPlanDays: updated,
        totalXp: prev.totalXp + xpBonus
      };
    });
  };

  const getUserLevelTitle = () => {
    if (state.totalXp < 100) return t('learn.level_beginner', language);
    if (state.totalXp < 250) return t('learn.level_intermediate', language);
    if (state.totalXp < 500) return t('learn.level_advanced', language);
    return t('learn.level_master', language);
  };

  const renderPhaseIcon = (name: string, size = 22) => {
    switch (name) {
      case 'Sun': return <Sun size={size} />;
      case 'Star': return <Star size={size} />;
      case 'Shield': return <Shield size={size} />;
      case 'Crown': return <Crown size={size} />;
      case 'Cross': return <Cross size={size} />;
      default: return <Heart size={size} />;
    }
  };

  const planProgressPercent = Math.round((state.completedPlanDays.length / 365) * 100);
  const todayReading = readingPlan365.find((r) => r.day === todayDay) || readingPlan365[0];

  const filteredPlan = readingPlan365.filter((r) => {
    const matchesMonth = selectedMonth === 'all' || r.monthName['pt-BR'] === selectedMonth;
    const matchesQuery = !planSearch || r.title[language].toLowerCase().includes(planSearch.toLowerCase()) || r.passages.some(p => p.label.toLowerCase().includes(planSearch.toLowerCase()));
    return matchesMonth && matchesQuery;
  });

  return (
    <section className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header & Gamification Stats Banner */}
      <div style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ color: 'hsl(var(--accent))' }}>{t('learn.title', language)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: 4 }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{t('nav.learn', language)}</h1>
            <p className="page-intro" style={{ margin: '4px 0 0' }}>{t('learn.subtitle', language)}</p>
          </div>

          {/* Gamification Badges Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Streak */}
            <div 
              className="paper-card" 
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 20, border: '1.5px solid #F59E0B', background: 'rgba(245, 158, 11, 0.08)' }}
              title={t('learn.streak_title', language)}
            >
              <Flame size={18} color="#F59E0B" fill="#F59E0B" />
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#D97706' }}>
                {state.streak} {t('learn.streak_days', language)}
              </span>
            </div>

            {/* XP */}
            <div 
              className="paper-card" 
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 20, border: '1.5px solid hsl(var(--accent))', background: 'hsl(var(--accent) / 0.08)' }}
              title={t('learn.wisdom_xp', language)}
            >
              <Sparkles size={18} color="hsl(var(--accent))" />
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'hsl(var(--accent))' }}>
                {state.totalXp} XP
              </span>
            </div>

            {/* Hearts */}
            <div 
              className="paper-card" 
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 20, border: '1.5px solid #EF4444', background: 'rgba(239, 68, 68, 0.08)' }}
              title={t('learn.hearts', language)}
            >
              <Heart size={18} color="#EF4444" fill="#EF4444" />
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#DC2626' }}>
                {state.hearts}/5
              </span>
            </div>

            {/* Rank/Level badge */}
            <div 
              className="paper-card" 
              style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 20 }}
              title={t('learn.level', language)}
            >
              <Trophy size={16} color="hsl(var(--accent))" />
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {getUserLevelTitle()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="scope-tabs" style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={`scope-tab ${activeTab === 'path' ? 'active' : ''}`}
          onClick={() => setActiveTab('path')}
          data-testid="tab-learn-path"
        >
          <Trophy size={15} /> {t('learn.tab_path', language)}
        </button>
        <button
          type="button"
          className={`scope-tab ${activeTab === 'beginner' ? 'active' : ''}`}
          onClick={() => setActiveTab('beginner')}
          data-testid="tab-learn-beginner"
        >
          <Compass size={15} /> {t('learn.tab_beginner', language)}
        </button>
        <button
          type="button"
          className={`scope-tab ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
          data-testid="tab-learn-plan"
        >
          <Calendar size={15} /> {t('learn.tab_year_plan', language)}
        </button>
      </div>

      {/* TAB 1: DUOLINGO BIBLE PATH */}
      {activeTab === 'path' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', padding: '10px 0 40px' }}>
          <div style={{ textAlign: 'center', maxWidth: 440, marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--app-font-serif)', fontSize: '1.4rem', margin: '0 0 6px' }}>
              Trilha da Revelação Bíblica
            </h3>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.88rem', margin: 0 }}>
              Avance pelas fases, resolva os desafios e descubra a história de Deus com a humanidade passo a passo!
            </p>
          </div>

          {/* Connected Path Nodes */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, width: '100%', maxWidth: 460, position: 'relative' }}>
            {learningPhases.map((phase, idx) => {
              const isUnlocked = state.unlockedPhaseIds.includes(phase.id);
              const isCompleted = state.completedPhaseIds.includes(phase.id);
              const isCurrent = isUnlocked && !isCompleted;

              // Alternating wave offset like Duolingo path (-35px, 0, +35px)
              const offsets = [0, 35, -35, 25, -25, 0];
              const xOffset = offsets[idx % offsets.length];

              return (
                <div 
                  key={phase.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    transform: `translateX(${xOffset}px)`,
                    transition: 'transform 0.3s ease',
                    position: 'relative'
                  }}
                >
                  {/* Floating Action Tooltip on Current Phase */}
                  {isCurrent && (
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 12px)',
                        background: 'hsl(var(--accent))',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: 12,
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                        animation: 'bounce 2s infinite'
                      }}
                    >
                      {t('learn.play_lesson', language)}!
                      <div 
                        style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: '50%', 
                          transform: 'translateX(-50%)', 
                          borderLeft: '6px solid transparent', 
                          borderRight: '6px solid transparent', 
                          borderTop: '6px solid hsl(var(--accent))' 
                        }} 
                      />
                    </div>
                  )}

                  {/* Circular Node Button */}
                  <button
                    type="button"
                    disabled={!isUnlocked}
                    onClick={() => setActivePhase(phase)}
                    style={{
                      width: 78,
                      height: 78,
                      borderRadius: '50%',
                      border: isCompleted 
                        ? '3.5px solid #22C55E' 
                        : isCurrent 
                        ? '3.5px solid hsl(var(--accent))' 
                        : '3.5px solid hsl(var(--border))',
                      background: isCompleted 
                        ? '#22C55E' 
                        : isCurrent 
                        ? 'hsl(var(--accent))' 
                        : 'hsl(var(--card))',
                      color: isUnlocked ? '#fff' : 'hsl(var(--muted-foreground))',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isUnlocked ? 'pointer' : 'not-allowed',
                      boxShadow: isCurrent ? '0 0 20px hsl(var(--accent) / 0.45)' : '0 4px 10px rgba(0,0,0,0.06)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    data-testid={`button-phase-${phase.id}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={32} />
                    ) : isUnlocked ? (
                      renderPhaseIcon(phase.iconName, 30)
                    ) : (
                      <Lock size={26} />
                    )}

                    {/* Star badge if completed */}
                    {isCompleted && (
                      <div 
                        style={{ 
                          position: 'absolute', 
                          top: -4, 
                          right: -4, 
                          background: '#F59E0B', 
                          borderRadius: '50%', 
                          padding: 4, 
                          color: '#fff',
                          display: 'flex' 
                        }}
                      >
                        <Star size={12} fill="currentColor" />
                      </div>
                    )}
                  </button>

                  {/* Phase Info Card below Node */}
                  <div style={{ textAlign: 'center', marginTop: 10, maxWidth: 220 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'hsl(var(--foreground))' }}>
                      {phase.number}. {phase.title[language]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                      {phase.subtitle[language]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: BEGINNER GUIDE */}
      {activeTab === 'beginner' && (
        <div>
          <div style={{ maxWidth: 640, marginBottom: 24 }}>
            <h3 style={{ fontFamily: 'var(--app-font-serif)', fontSize: '1.4rem', margin: '0 0 6px' }}>
              Guia Prático: Por Onde Começar a Ler a Bíblia
            </h3>
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem', margin: 0 }}>
              A Bíblia não precisa ser lida estritamente de capa a capa na primeira vez. Esta trilha curada apresenta primeiro o coração de Jesus, a oração e a sabedoria para que sua jornada seja clara e inspiradora.
            </p>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {beginnerSteps.map((step) => (
              <div 
                key={step.id} 
                className="paper-card"
                style={{ padding: 22, borderRadius: 16, border: '1.5px solid hsl(var(--border))' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 12 }}>
                  <div>
                    <span className="pill" style={{ background: 'hsl(var(--accent) / 0.12)', color: 'hsl(var(--accent))', fontWeight: 700, marginBottom: 8 }}>
                      {step.tag}
                    </span>
                    <h4 style={{ margin: '6px 0 2px', fontFamily: 'var(--app-font-serif)', fontSize: '1.25rem' }}>
                      {step.title[language]}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                      {step.subtitle[language]}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    onClick={() => onOpenReader(step.book, step.chapter)}
                    data-testid={`button-read-step-${step.id}`}
                  >
                    <BookOpen size={14} /> {t('learn.open_in_reader', language)}
                  </button>
                </div>

                <div style={{ display: 'grid', gap: 10, marginTop: 14, fontSize: '0.88rem', lineHeight: 1.6 }}>
                  <div style={{ background: 'hsl(var(--background) / 0.6)', padding: '12px 14px', borderRadius: 12 }}>
                    <strong style={{ color: 'hsl(var(--accent))' }}>{t('learn.why_start_here', language)}:</strong> {step.whyRead[language]}
                  </div>
                  <div style={{ background: 'hsl(var(--background) / 0.6)', padding: '12px 14px', borderRadius: 12 }}>
                    <strong style={{ color: 'hsl(var(--accent))' }}>{t('learn.beginner_tip', language)}:</strong> {step.howToRead[language]}
                  </div>
                </div>

                {/* Key verse */}
                <div style={{ marginTop: 14, borderLeft: '3px solid hsl(var(--accent))', paddingLeft: 12, fontStyle: 'italic', fontSize: '0.85rem', color: 'hsl(var(--foreground))' }}>
                  "{step.keyVerseText[language]}" <span style={{ fontWeight: 700, fontStyle: 'normal', color: 'hsl(var(--muted-foreground))' }}>— {step.keyVerse}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 365 DAYS PLAN */}
      {activeTab === 'plan' && (
        <div>
          {/* Today's reading hero card */}
          <div 
            className="paper-card" 
            style={{ 
              padding: 24, 
              borderRadius: 18, 
              border: '2px solid hsl(var(--accent))', 
              background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--accent) / 0.08) 100%)',
              marginBottom: 24 
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
              <div>
                <span className="pill" style={{ background: 'hsl(var(--accent))', color: '#fff', fontWeight: 800 }}>
                  HOJE · DIA {todayDay} DE 365
                </span>
                <h3 style={{ margin: '8px 0 4px', fontFamily: 'var(--app-font-serif)', fontSize: '1.4rem' }}>
                  {todayReading.title[language]}
                </h3>
                <div style={{ fontSize: '0.88rem', color: 'hsl(var(--muted-foreground))' }}>
                  Passagens sugeridas para hoje:
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="outline-button"
                  onClick={() => togglePlanDay(todayDay)}
                  style={{
                    padding: '8px 16px',
                    borderColor: state.completedPlanDays.includes(todayDay) ? '#22C55E' : undefined,
                    color: state.completedPlanDays.includes(todayDay) ? '#22C55E' : undefined
                  }}
                  data-testid="button-toggle-today-plan"
                >
                  <Check size={16} /> {state.completedPlanDays.includes(todayDay) ? t('learn.completed', language) : t('learn.mark_completed', language)}
                </button>

                <button
                  type="button"
                  className="primary-button"
                  style={{ padding: '8px 16px' }}
                  onClick={() => onOpenReader(todayReading.passages[0].book, todayReading.passages[0].chapter)}
                  data-testid="button-read-today-plan"
                >
                  <BookOpen size={16} /> {t('learn.read_today', language)}
                </button>
              </div>
            </div>

            {/* Passage chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {todayReading.passages.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onOpenReader(p.book, p.chapter)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 10,
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'hsl(var(--accent))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  <BookOpen size={13} /> {p.label} <ChevronRight size={12} />
                </button>
              ))}
            </div>

            {/* Overall Year Progress Bar */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
                <span>{t('learn.year_progress', language)}: {state.completedPlanDays.length} {t('learn.days_read', language)}</span>
                <span style={{ fontWeight: 700, color: 'hsl(var(--accent))' }}>{planProgressPercent}%</span>
              </div>
              <div style={{ height: 8, background: 'hsl(var(--input))', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${planProgressPercent}%`, background: 'hsl(var(--accent))', borderRadius: 999, transition: 'width 0.3s ease' }} />
              </div>
            </div>
          </div>

          {/* Search & Month Filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 200 }}>
              <Search size={15} />
              <input
                type="search"
                className="search-input"
                placeholder="Buscar por livro ou dia..."
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                data-testid="input-search-plan"
              />
            </div>

            <select
              className="select-field filter-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Filtrar plano por mês"
              data-testid="select-plan-month"
            >
              <option value="all">Todos os meses (365 dias)</option>
              <option value="Janeiro">Janeiro</option>
              <option value="Fevereiro">Fevereiro</option>
              <option value="Março">Março</option>
              <option value="Abril">Abril</option>
              <option value="Maio">Maio</option>
              <option value="Junho">Junho</option>
              <option value="Julho">Julho</option>
              <option value="Agosto">Agosto</option>
              <option value="Setembro">Setembro</option>
              <option value="Outubro">Outubro</option>
              <option value="Novembro">Novembro</option>
              <option value="Dezembro">Dezembro</option>
            </select>
          </div>

          {/* 365 Days Grid / List */}
          <div style={{ display: 'grid', gap: 8, maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
            {filteredPlan.slice(0, 100).map((item) => {
              const isDone = state.completedPlanDays.includes(item.day);
              const isToday = item.day === todayDay;

              return (
                <div
                  key={item.day}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: isToday 
                      ? 'hsl(var(--accent) / 0.08)' 
                      : 'hsl(var(--card))',
                    border: isToday 
                      ? '1.5px solid hsl(var(--accent))' 
                      : '1px solid hsl(var(--border))',
                    opacity: isDone ? 0.65 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => togglePlanDay(item.day)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: isDone ? '1px solid #22C55E' : '1px solid hsl(var(--input))',
                        background: isDone ? '#22C55E' : 'transparent',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      data-testid={`checkbox-plan-day-${item.day}`}
                    >
                      {isDone && <Check size={15} />}
                    </button>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', textDecoration: isDone ? 'line-through' : 'none' }}>
                        {item.title[language]}
                        {isToday && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'hsl(var(--accent))', fontWeight: 800 }}>HOJE</span>}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'hsl(var(--muted-foreground))', display: 'flex', gap: 8, marginTop: 2 }}>
                        {item.passages.map(p => p.label).join(' · ')}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-button"
                    title="Abrir no leitor"
                    onClick={() => onOpenReader(item.passages[0].book, item.passages[0].chapter)}
                    data-testid={`button-open-reader-day-${item.day}`}
                  >
                    <BookOpen size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Lesson Modal */}
      {activePhase && (
        <LessonModal
          phase={activePhase}
          language={language}
          currentHearts={state.hearts}
          onLoseHeart={handleLoseHeart}
          onComplete={handleCompleteLesson}
          onClose={() => setActivePhase(null)}
          onOpenReader={onOpenReader}
        />
      )}
    </section>
  );
}
