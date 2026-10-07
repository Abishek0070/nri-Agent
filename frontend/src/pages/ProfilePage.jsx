import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Globe, Award, Star, Flame, LogOut, ArrowLeft, ShieldCheck, Edit3, Mic, Sparkles, BookOpen, ChevronRight, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { AmmachiMascot } from '../components/common/AmmachiMascot';
import { userService } from '../services/userService';

export const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { currentLanguage, setLanguage, languages, activeLangMeta } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getProfile();
        setProfile(data);
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentLanguage]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const username = user?.username || 'Student';
  const points = profile?.points ?? user?.points ?? 0;
  const streak = profile?.streak || 1;
  const overallProgress = profile?.overall_progress || 0;
  
  // Learning progress
  const handwritingScore = profile?.handwriting_score || 0;
  const speakingScore = profile?.speaking_score || 0;
  const cultureScore = profile?.culture_score || 0;
  
  // Fake empty/achievements based on requirement: "If the application does not currently have an achievement system, create ONLY the visual placeholder structure"
  const achievements = [
    { id: 'first_letter', icon: '⭐', title: 'First Letter', locked: handwritingScore === 0 },
    { id: 'streak', icon: '🔥', title: 'Learning Streak', locked: streak <= 1 },
    { id: 'writing', icon: '✍️', title: 'Writing Star', locked: handwritingScore < 50 },
    { id: 'speaking', icon: '🗣️', title: 'Speaking Starter', locked: speakingScore === 0 },
    { id: 'explorer', icon: '🏆', title: 'Language Explorer', locked: cultureScore < 20 },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto animate-in fade-in duration-200 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-wider mb-1">
            <Link to="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span>•</span>
            <span>My Space</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
            Child Profile
          </h1>
        </div>
      </div>

      {/* 1. PROFILE HEADER */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
        <AmmachiMascot size="lg" className="ring-4 ring-amber-300 shrink-0 bg-white" />
        <div className="w-full text-center sm:text-left space-y-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-amber-950">
              Hi, {username}! 👋
            </h2>
            <p className="text-sm font-bold text-amber-800 uppercase tracking-wider mt-1">
              {currentLanguage} Explorer
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <span className="px-4 py-1.5 rounded-full bg-white border border-amber-200 text-amber-900 text-sm font-extrabold flex items-center gap-1.5 shadow-sm">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              {points} Points
            </span>
            <span className="px-4 py-1.5 rounded-full bg-white border border-orange-200 text-orange-900 text-sm font-extrabold flex items-center gap-1.5 shadow-sm">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-400" />
              {streak} Day Streak
            </span>
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-xs font-bold text-amber-900 mb-1.5">
              <span>{currentLanguage} Journey</span>
              <span>{overallProgress}%</span>
            </div>
            <div className="h-4 bg-amber-200/50 rounded-full overflow-hidden border border-amber-200">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            {overallProgress === 0 && (
              <p className="text-[11px] font-medium text-amber-700/80 mt-1.5">Start learning to build your journey!</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. MY LEARNING */}
      <div className="bg-white border-2 border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-emerald-600" />
          <h3 className="text-xl font-black text-stone-900">My Learning</h3>
        </div>
        
        <div className="space-y-5">
          {/* Letters / Handwriting */}
          <div className="group cursor-pointer" onClick={() => navigate('/handwriting')}>
            <div className="flex justify-between text-sm font-bold text-stone-700 mb-1.5">
              <span className="flex items-center gap-2"><Edit3 className="w-4 h-4 text-blue-500"/> Letters</span>
              <span>{handwritingScore}%</span>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${handwritingScore}%` }} />
            </div>
          </div>
          
          {/* Speaking */}
          <div className="group cursor-pointer" onClick={() => navigate('/speaking')}>
            <div className="flex justify-between text-sm font-bold text-stone-700 mb-1.5">
              <span className="flex items-center gap-2"><Mic className="w-4 h-4 text-emerald-500"/> Speaking</span>
              <span>{speakingScore}%</span>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${speakingScore}%` }} />
            </div>
          </div>
          
          {/* Culture */}
          <div className="group cursor-pointer" onClick={() => navigate('/culture')}>
            <div className="flex justify-between text-sm font-bold text-stone-700 mb-1.5">
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500"/> Culture</span>
              <span>{cultureScore}%</span>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-400 rounded-full" style={{ width: `${cultureScore}%` }} />
            </div>
          </div>
        </div>

        {overallProgress === 0 ? (
          <p className="text-sm font-medium text-stone-500 text-center mt-6">
            Start learning to track your progress.
          </p>
        ) : null}

        <button 
          onClick={() => navigate('/')}
          className="mt-6 w-full py-3.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-colors"
        >
          Continue Learning <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. LANGUAGE SWITCHER */}
      <div className="bg-white border-2 border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <h3 className="text-xl font-black text-stone-900 flex items-center gap-2 mb-1">
            <Globe className="w-6 h-6 text-sky-600" />
            <span>My Native Language</span>
          </h3>
          <p className="text-sm font-medium text-stone-500">
            Choose the language Ammachi will teach you across your learning activities.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {languages.map((lang) => {
            const isCurrent = currentLanguage === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all select-none flex items-center justify-between group ${
                  isCurrent
                    ? 'bg-amber-100 border-amber-400 shadow-sm'
                    : 'bg-stone-50 border-stone-200 hover:border-amber-300'
                }`}
              >
                <div>
                  <span className={`text-base font-black block ${isCurrent ? 'text-amber-950' : 'text-stone-700'}`}>
                    {lang.name}
                  </span>
                  <span className={`text-xl font-medium block mt-0.5 ${isCurrent ? 'text-amber-900' : 'text-stone-500'}`}>
                    {lang.nativeName}
                  </span>
                </div>
                {isCurrent && (
                  <div className="bg-amber-400 text-amber-950 text-[10px] font-black uppercase px-2 py-1 rounded-full absolute top-4 right-4 shadow-sm">
                    Current
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACHIEVEMENTS */}
      <div className="bg-white border-2 border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-orange-500" />
            <span>Achievements</span>
          </h3>
          <button className="text-xs font-bold text-stone-500 hover:text-stone-800">
            View all &rarr;
          </button>
        </div>

        <div className="flex overflow-x-auto gap-4 pb-2 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {achievements.map((ach) => (
            <div 
              key={ach.id} 
              className={`shrink-0 w-28 p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center gap-2 snap-start ${
                ach.locked 
                  ? 'bg-stone-50 border-stone-100 opacity-60 grayscale' 
                  : 'bg-amber-50 border-amber-200 shadow-sm'
              }`}
            >
              <span className="text-3xl">{ach.icon}</span>
              <span className="text-[11px] font-bold text-stone-700 leading-tight">
                {ach.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. ACCOUNT & SECURITY */}
      <div className="bg-stone-50 border-2 border-stone-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 shrink-0 rounded-full bg-stone-200/70 flex items-center justify-center text-stone-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-sm font-black text-stone-900 block">Account & Security</span>
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Session securely active</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="w-full sm:w-auto whitespace-nowrap px-6 py-2.5 rounded-xl border-2 border-stone-300 text-stone-600 hover:bg-stone-200 hover:text-stone-900 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
      
      {/* Hide scrollbar injected style for achievements */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </div>
  );
};
