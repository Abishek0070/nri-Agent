import React, { useState, useEffect } from 'react';
import { Award, Star, Flame, CheckCircle2, BookOpen, Edit3, Mic, Sparkles, Calendar, ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { userService } from '../services/userService';
import { visionService } from '../services/visionService';

export const ProgressPage = () => {
  const { user } = useAuth();
  const { currentLanguage } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [writingStats, setWritingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profData, wStats] = await Promise.all([
          userService.getProfile(),
          visionService.getWritingStats().catch(() => null)
        ]);
        setProfile(profData);
        setWritingStats(wStats);
      } catch (err) {
        console.error('Failed to fetch profile progress:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const points = profile?.points ?? user?.points ?? 0;
  const streak = profile?.streak || 1;
  const stamps = profile?.stamps || [];
  const activities = profile?.recent_activities || [];

  const defaultStamps = [
    { name: 'Pongal Harvest Hero', icon: '🌾', earned: stamps.some(s => s.stamp_name?.toLowerCase().includes('pongal')) },
    { name: 'Diwali Lamp of Light', icon: '🪔', earned: stamps.some(s => s.stamp_name?.toLowerCase().includes('diwali') || s.stamp_name?.toLowerCase().includes('deepavali')) },
    { name: 'Ugadi Six Tastes Master', icon: '🌿', earned: stamps.some(s => s.stamp_name?.toLowerCase().includes('ugadi')) },
    { name: 'Tamil Script Scholar', icon: '✍️', earned: (writingStats?.mastered_count > 0 || profile?.writing_score > 0) },
    { name: 'Fluent Native Speaker', icon: '🎤', earned: profile?.speaking_score > 0 },
    { name: "Grandmother's Star Student", icon: '⭐', earned: points >= 50 }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-wider mb-1">
            <Link to="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span>•</span>
            <span>Mastery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
            🏆 Cultural Passport & Progress
          </h1>
          <p className="text-sm font-medium text-stone-600">
            Track your language fluency milestones and view real handwriting statistics from PostgreSQL!
          </p>
        </div>
      </div>

      {/* Summary Scorecard Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-5 text-center shadow-sm">
          <div className="text-3xl font-black text-amber-900 flex items-center justify-center gap-1.5">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
            <span>{points}</span>
          </div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mt-1">Total Points</span>
        </div>

        <div className="bg-white border-2 border-orange-200 rounded-3xl p-5 text-center shadow-sm">
          <div className="text-3xl font-black text-orange-600 flex items-center justify-center gap-1.5">
            <Flame className="w-6 h-6 text-orange-500 fill-orange-400 animate-pulse" />
            <span>{streak} Days</span>
          </div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mt-1">Learning Streak</span>
        </div>

        <div className="bg-white border-2 border-purple-200 rounded-3xl p-5 text-center shadow-sm">
          <div className="text-3xl font-black text-purple-700 flex items-center justify-center gap-1.5">
            <Award className="w-6 h-6 text-purple-600" />
            <span>{stamps.length}</span>
          </div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mt-1">Stamps Earned</span>
        </div>

        <div className="bg-white border-2 border-emerald-200 rounded-3xl p-5 text-center shadow-sm">
          <div className="text-3xl font-black text-emerald-700">
            {profile?.overall_progress || 0}%
          </div>
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mt-1">Overall Mastery</span>
        </div>
      </div>



      {/* Module Breakdown Bars */}
      <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-amber-950 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-600" />
          <span>Module Mastery Breakdown</span>
        </h3>

        <div className="space-y-3">


          {/* Speaking */}
          <div>
            <div className="flex justify-between text-xs font-bold text-stone-700 mb-1">
              <span className="flex items-center gap-1">🎤 AI Voice Fluency</span>
              <span>{profile?.speaking_score || 0}%</span>
            </div>
            <div className="w-full h-3 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${profile?.speaking_score || 0}%` }}
              />
            </div>
          </div>

          {/* Culture */}
          <div>
            <div className="flex justify-between text-xs font-bold text-stone-700 mb-1">
              <span className="flex items-center gap-1">🪔 Cultural Discovery</span>
              <span>{profile?.culture_score || 0}%</span>
            </div>
            <div className="w-full h-3 bg-purple-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${profile?.culture_score || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Passport Stamps Gallery */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-amber-950 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-700" />
              <span>Digital Cultural Passport</span>
            </h3>
            <p className="text-xs font-semibold text-stone-600">
              Collect all stamps by learning cultural folklore and passing quizzes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {defaultStamps.map((stamp, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                stamp.earned
                  ? 'bg-white border-amber-400 shadow-md scale-105'
                  : 'bg-stone-100/70 border-stone-200 opacity-60 grayscale'
              }`}
            >
              <span className="text-4xl mb-2">{stamp.icon}</span>
              <span className="text-xs font-extrabold text-stone-900 leading-tight">
                {stamp.name}
              </span>
              <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                stamp.earned ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-600'
              }`}>
                {stamp.earned ? 'Unlocked ✨' : 'Locked 🔒'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-black text-amber-950 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-600" />
          <span>Recent Activity Timeline</span>
        </h3>

        {activities.length === 0 ? (
          <p className="text-xs font-semibold text-stone-500 py-4 text-center">
            No activities logged yet. Start writing or speaking to build your journey!
          </p>
        ) : (
          <div className="divide-y divide-amber-100">
            {activities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {act.module === 'writing' ? '✍️' : (act.module === 'voice' ? '🎤' : '🪔')}
                  </span>
                  <div>
                    <span className="text-sm font-bold text-stone-900 block">{act.activity}</span>
                    <span className="text-xs font-semibold text-stone-500">
                      Language: {act.language} • {new Date(act.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-700">+{act.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
