import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swords, Copy, Share2, Play, Users, Trophy, ChevronRight, CheckCircle2, XCircle, ArrowLeft, Loader2, Link as LinkIcon } from 'lucide-react';
import { challengeService } from '../services/challengeService';

const LANGUAGES = [
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', flag: '🇮🇳' }
];

const DIFFICULTIES = [
  { id: 'beginner', label: 'Beginner', color: 'emerald' },
  { id: 'intermediate', label: 'Intermediate', color: 'amber' },
  { id: 'advanced', label: 'Advanced', color: 'rose' }
];

export const ChallengePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [challengeState, setChallengeState] = useState(null);
  const [participantId, setParticipantId] = useState(() => localStorage.getItem(`challenge_pid_${id}`) || null);
  const [nickname, setNickname] = useState(() => localStorage.getItem('ammachi_nickname') || '');

  // Create Form State
  const [selectedLang, setSelectedLang] = useState('ta');
  const [selectedDiff, setSelectedDiff] = useState('beginner');

  // Game State
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState('game');

  const wsRef = useRef(null);

  useEffect(() => {
    if (id) {
      loadChallenge();
    }
  }, [id]);

  useEffect(() => {
    if (id && challengeState) {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [id, challengeState?.status]); // Reconnect if status changes or id changes

  useEffect(() => {
    if (challengeState?.status === 'ACTIVE') {
      // If active and no question, fetch first question
      if (!currentQuestion && participantId && !feedback) {
        fetchNextQuestion();
      }
    }

    if (challengeState?.status === 'COMPLETED' && !results) {
      fetchResults();
    }
  }, [challengeState?.status]);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      const data = await challengeService.getChallenge(id);
      setChallengeState(data);
    } catch (err) {
      setError(err.message || "Challenge not found or expired.");
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = challengeService.createWebSocketUrl(id);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'STATE_UPDATE') {
          setChallengeState(data);
        }
      };

      ws.onerror = (e) => console.error("WS Error", e);
      wsRef.current = ws;
    } catch (e) {
      console.error("WS Connection failed", e);
    }
  };

  const handleCreate = async () => {
    if (!nickname.trim()) return alert("Please enter a nickname!");
    try {
      setLoading(true);
      localStorage.setItem('ammachi_nickname', nickname);
      const data = await challengeService.createChallenge({
        language: selectedLang,
        difficulty: selectedDiff,
        nickname: nickname.trim()
      });
      // The creator is participant index 0
      const newPid = data.participants[0].id;
      localStorage.setItem(`challenge_pid_${data.id}`, newPid);
      setParticipantId(newPid);
      navigate(`/challenge/${data.id}`);
    } catch (err) {
      alert("Failed to create challenge: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!nickname.trim()) return alert("Please enter a nickname!");
    try {
      setLoading(true);
      localStorage.setItem('ammachi_nickname', nickname);
      const data = await challengeService.joinChallenge(id, nickname.trim());
      // Find our ID (last one added usually, or match nickname)
      const myPart = data.participants.find(p => p.nickname === nickname.trim()) || data.participants[data.participants.length - 1];
      if (myPart) {
        localStorage.setItem(`challenge_pid_${id}`, myPart.id);
        setParticipantId(myPart.id);
      }
      setChallengeState(data);
    } catch (err) {
      alert("Failed to join: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      await challengeService.startChallenge(id);
    } catch (err) {
      alert("Failed to start: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/challenge/${id}`;
    navigator.clipboard.writeText(url);
    alert("Challenge link copied to clipboard!");
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/challenge/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ammachi AI Challenge',
          text: 'I challenge you to a 5-minute language game!',
          url: url
        });
      } catch (e) {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  const fetchNextQuestion = async () => {
    if (!participantId) return;
    try {
      setLoading(true);
      setFeedback(null);
      setAnswerInput('');
      setCurrentQuestion(null);
      const q = await challengeService.getNextQuestion(id, participantId);
      setCurrentQuestion(q);
    } catch (err) {
      if (err.message.includes("No questions available")) {
        // Just wait or retry shortly, maybe LLM is generating
        setTimeout(fetchNextQuestion, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (ans) => {
    if (!ans) return;
    try {
      setLoading(true);
      const res = await challengeService.submitAnswer(id, {
        participant_id: parseInt(participantId),
        question_id: currentQuestion.id,
        submitted_answer: ans
      });
      setFeedback(res);
      // Wait a moment then fetch next
      setTimeout(() => {
        fetchNextQuestion();
      }, 2500);
    } catch (err) {
      alert("Failed to submit: " + err.message);
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await challengeService.getResults(id);
      setResults(res);
      setChallengeState(prev => ({ ...prev, status: 'COMPLETED' }));
    } catch (e) {
      console.error(e);
    }
  };



  // ==========================================
  // VIEW: CREATE CHALLENGE
  // ==========================================
  if (!id) {
    return (
      <div className="min-h-screen bg-stone-50 pb-20 pt-8 px-4 flex justify-center">
        <div className="max-w-md w-full space-y-6">
          <button onClick={() => navigate('/')} className="flex items-center text-stone-500 font-bold text-sm hover:text-stone-800 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </button>

          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-md mb-4 transform -rotate-3">
                <Swords className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-amber-950 tracking-tight">Challenge a Friend</h1>
              <p className="text-sm font-semibold text-stone-500 mt-1">10-Question Language Battle</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-stone-600 uppercase mb-1.5">Your Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="w-full bg-stone-100 border-2 border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 focus:border-amber-400 focus:bg-white outline-none transition-all"
                  placeholder="e.g. Master Tamil"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-600 uppercase mb-1.5">Language</label>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLang(lang.code)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold transition-all ${selectedLang === lang.code
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-amber-200'
                        }`}
                    >
                      <span>{lang.flag}</span> {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-600 uppercase mb-1.5">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map(diff => (
                    <button
                      key={diff.id}
                      onClick={() => setSelectedDiff(diff.id)}
                      className={`py-2 rounded-xl border-2 font-bold text-xs transition-all ${selectedDiff === diff.id
                          ? `border-${diff.color}-500 bg-${diff.color}-50 text-${diff.color}-900`
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                        }`}
                    >
                      {diff.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={loading || !nickname}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />}
                Create Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle Error State
  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <XCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-xl font-black text-stone-800 mb-2">Oops!</h2>
        <p className="text-stone-600 font-medium mb-6 text-center">{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary px-6 py-2">Return Home</button>
      </div>
    );
  }

  if (!challengeState) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // ==========================================
  // VIEW: JOIN CHALLENGE (Not Participant Yet)
  // ==========================================
  if (!participantId) {
    return (
      <div className="min-h-screen bg-stone-50 p-4 flex justify-center items-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Swords className="w-8 h-8 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-stone-800">You've Been Challenged!</h1>
            <div className="flex justify-center gap-2 mt-2">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full capitalize">{challengeState.language}</span>
              <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-bold rounded-full capitalize">{challengeState.difficulty}</span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">10 Qs</span>
            </div>
          </div>

          <div className="text-left">
            <label className="block text-xs font-black text-stone-600 uppercase mb-1.5">Enter Nickname to Play</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="w-full bg-stone-100 border-2 border-stone-200 rounded-xl px-4 py-3 font-bold text-stone-800 focus:border-blue-400 focus:bg-white outline-none transition-all"
              placeholder="Your name"
              maxLength={15}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={loading || !nickname}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black text-lg shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join the Battle!'}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: LOBBY
  // ==========================================
  if (challengeState.status === 'WAITING') {
    const isCreator = challengeState.participants.length > 0 && String(challengeState.participants[0].id) === String(participantId);

    return (
      <div className="min-h-screen bg-stone-50 p-4">
        <div className="max-w-md w-full mx-auto space-y-6 pt-4">

          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200 text-center">
            <h2 className="text-2xl font-black text-amber-950 mb-1">Challenge Lobby</h2>
            <p className="text-sm font-bold text-stone-500 capitalize">{challengeState.language} • {challengeState.difficulty}</p>

            <div className="mt-8 mb-8 relative">
              <div className="flex justify-center items-center gap-4">
                {challengeState.participants.map((p, i) => (
                  <React.Fragment key={p.id}>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white mb-2">
                        <span className="text-white font-black text-xl">{p.nickname.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-bold text-stone-800 text-sm">{p.nickname}</span>
                      {String(p.id) === String(participantId) && <span className="text-[10px] font-black text-amber-600 uppercase">You</span>}
                    </div>
                    {i < challengeState.participants.length - 1 && (
                      <div className="text-2xl font-black text-stone-300 mx-2 italic">VS</div>
                    )}
                  </React.Fragment>
                ))}

                {/* Placeholder if waiting for player 2 */}
                {challengeState.participants.length < 2 && (
                  <>
                    <div className="text-2xl font-black text-stone-300 mx-2 italic">VS</div>
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-stone-200 rounded-full flex items-center justify-center shadow-inner border-4 border-white mb-2 animate-pulse">
                        <Users className="w-6 h-6 text-stone-400" />
                      </div>
                      <span className="font-bold text-stone-400 text-sm">Waiting...</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {challengeState.participants.length < 2 && (
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-6 text-left">
                <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5"><LinkIcon className="w-4 h-4" /> Share link with a friend:</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-medium text-stone-600 truncate flex items-center">
                    {`${window.location.origin}/challenge/${id}`}
                  </div>
                  <button onClick={copyLink} className="p-2 bg-white border border-amber-200 rounded-xl text-amber-700 hover:bg-amber-100 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                  {navigator.share && (
                    <button onClick={shareLink} className="p-2 bg-amber-500 text-white rounded-xl shadow-md hover:bg-amber-600 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {isCreator ? (
              <button
                onClick={handleStart}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-white" />}
                START CHALLENGE
              </button>
            ) : (
              <div className="py-3.5 bg-stone-100 text-stone-500 rounded-xl font-black text-sm flex items-center justify-center gap-2 animate-pulse border-2 border-stone-200">
                Waiting for host to start...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: RESULTS
  // ==========================================
  if (challengeState.status === 'COMPLETED' && results) {
    return (
      <div className="min-h-screen bg-stone-50 p-4 pb-20 pt-8 flex justify-center">
        <div className="max-w-md w-full space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200 text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
            <h1 className="text-3xl font-black text-amber-950">Challenge Complete!</h1>
            <p className="text-stone-500 font-bold capitalize mt-1 mb-8">{challengeState.language} • {challengeState.difficulty}</p>

            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={r.participant_id} className={`flex items-center justify-between p-4 rounded-2xl border-2 ${i === 0 ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-stone-400 w-6">{i === 0 ? '🥇' : '🥈'}</span>
                    <div className="text-left">
                      <div className="font-black text-stone-800 text-lg flex items-center gap-2">
                        {r.nickname}
                        {String(r.participant_id) === String(participantId) && <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] uppercase rounded-full">You</span>}
                      </div>
                      <div className="text-xs font-bold text-stone-500">{r.correct_answers} / {r.total_answers} correct</div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-600">{r.score}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              <button onClick={() => navigate('/challenge')} className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-black text-lg shadow-lg hover:bg-amber-600 transition-colors">
                New Challenge ⚔️
              </button>
              <button onClick={() => navigate('/')} className="w-full py-3.5 bg-stone-100 text-stone-700 border-2 border-stone-200 rounded-xl font-black text-lg hover:bg-stone-200 transition-colors">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: ACTIVE GAMEPLAY
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-50 pb-safe">
      {/* HUD Header */}
      <div className="bg-white px-4 py-0 border-b-2 border-amber-200 flex flex-col sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between pt-3 pb-2 w-full max-w-md mx-auto">
          <div className="flex gap-4 px-2 items-center">
            <button
              onClick={() => setActiveTab('game')}
              className={`font-black uppercase tracking-wider text-sm pb-1 transition-all ${activeTab === 'game' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Game
            </button>
            <button
              onClick={() => setActiveTab('scores')}
              className={`font-black uppercase tracking-wider text-sm pb-1 transition-all ${activeTab === 'scores' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Scores
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 px-4 py-1.5 rounded-full border border-emerald-300">
              <span className="text-sm font-black tracking-wider text-emerald-900 uppercase">
                10 Questions
              </span>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to leave the challenge?")) {
                  navigate('/');
                }
              }}
              className="p-1.5 bg-stone-100 text-stone-500 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition-colors border border-stone-200 hover:border-rose-200"
              title="Leave Challenge"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-md mx-auto w-full p-4 pt-6">

        {activeTab === 'scores' ? (
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-black text-stone-800 mb-6 text-center">Live Standings</h2>
            <div className="space-y-4">
              {[...challengeState.participants].sort((a, b) => b.score - a.score).map((p, i) => {
                const isMe = String(p.id) === String(participantId);
                return (
                  <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 ${isMe ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-stone-400 w-6">{i + 1}</span>
                      <div className="text-left">
                        <div className="font-black text-stone-800 text-base flex items-center gap-2">
                          {p.nickname}
                          {isMe && <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] uppercase rounded-full">You</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-xl font-black text-amber-600">⭐ {p.score}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : loading && !currentQuestion ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-amber-400" />
            <span className="font-bold">Preparing next question...</span>
          </div>
        ) : currentQuestion ? (
          <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200 animate-in fade-in slide-in-from-bottom-4">

            <div className="mb-6 text-center">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-black rounded-full uppercase tracking-wider">
                {currentQuestion.q_type.replace(/_/g, ' ')}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-stone-800 mt-4 leading-tight">
                {currentQuestion.question_text}
              </h2>
            </div>

            {/* OPTIONS OR INPUT */}
            <div className="space-y-3">
              {currentQuestion.q_type === 'multiple_choice' && currentQuestion.options ? (
                currentQuestion.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => submitAnswer(opt)}
                    disabled={loading || feedback}
                    className="w-full p-4 text-left rounded-2xl border-2 border-stone-200 bg-white font-bold text-lg text-stone-700 hover:border-amber-400 hover:bg-amber-50 transition-all disabled:opacity-50"
                  >
                    {opt}
                  </button>
                ))
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answerInput}
                    onChange={e => setAnswerInput(e.target.value)}
                    disabled={loading || feedback}
                    onKeyDown={e => e.key === 'Enter' && submitAnswer(answerInput)}
                    className="flex-1 bg-stone-100 border-2 border-stone-200 rounded-2xl px-4 py-3.5 font-bold text-stone-800 text-lg outline-none focus:border-amber-400 focus:bg-white transition-all disabled:opacity-50"
                    placeholder="Type your answer..."
                  />
                  <button
                    onClick={() => submitAnswer(answerInput)}
                    disabled={loading || feedback || !answerInput.trim()}
                    className="px-6 bg-amber-500 text-white rounded-2xl font-black shadow-md hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            {/* FEEDBACK OVERLAY */}
            {feedback && (
              <div className={`mt-6 p-4 rounded-2xl border-2 animate-in zoom-in-95 ${feedback.is_correct ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`}>
                <div className="flex items-start gap-3">
                  {feedback.is_correct ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />}
                  <div>
                    <h4 className={`text-lg font-black ${feedback.is_correct ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {feedback.is_correct ? 'Correct! +100 ⭐' : 'Incorrect'}
                    </h4>
                    {!feedback.is_correct && (
                      <p className="text-sm font-bold text-stone-600 mt-1">Answer: <span className="text-stone-800">{feedback.correct_answer}</span></p>
                    )}
                    {feedback.explanation && (
                      <p className={`text-xs font-semibold mt-2 ${feedback.is_correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {feedback.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-stone-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-amber-400" />
            <span className="font-bold">Waiting for challenge to begin...</span>
          </div>
        )}

      </div>
    </div>
  );
};
