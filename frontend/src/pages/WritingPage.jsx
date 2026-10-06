import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Upload, RefreshCw, CheckCircle2, XCircle, Volume2, Sparkles,
  ImageIcon, ArrowLeft, Eye, Award, Star, Flame, RotateCcw, Play, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { visionService } from '../services/visionService';
import { voiceService } from '../services/voiceService';
import { triggerCelebration } from '../components/common/Confetti';
import { SpeechBubble } from '../components/common/SpeechBubble';
import { HandwritingCanvas } from '../components/writing/HandwritingCanvas';

import { CurriculumBrowser } from '../components/writing/CurriculumBrowser';

export const WritingPage = () => {
  const { currentLanguage } = useLanguage();
  const { refreshUser } = useAuth();

  const [curriculum, setCurriculum] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeLevel, setActiveLevel] = useState(1);
  const [mode, setMode] = useState('guided'); // 'guided', 'free', 'camera'
  const [loadingCurriculum, setLoadingCurriculum] = useState(true);

  // Attempt tracking
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [attemptHistory, setAttemptHistory] = useState([]);

  // Evaluation & Modal state
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);


  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load full curriculum dataset dynamically
  useEffect(() => {
    const fetchCurriculum = async () => {
      setLoadingCurriculum(true);
      try {
        const list = await visionService.getCurriculum(currentLanguage);
        setCurriculum(list);
        if (list && list.length > 0) {
          const firstLevelItems = list.filter(i => (i.level || 1) === 1);
          setSelectedItem(firstLevelItems[0] || list[0]);
        }
      } catch (err) {
        console.error('Failed to load curriculum dataset:', err);
      } finally {
        setLoadingCurriculum(false);
      }
    };
    fetchCurriculum();
    setActiveLevel(1);
    setAttemptNumber(1);
    setAttemptHistory([]);
    setResult(null);
  }, [currentLanguage]);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setAttemptNumber(1);
    setAttemptHistory([]);
    setResult(null);
  };

  const handleSelectLevel = (level) => {
    setActiveLevel(level);
    const levelItems = curriculum.filter(i => (i.level || 1) === level);
    if (levelItems.length > 0) {
      setSelectedItem(levelItems[0]);
    }
    setAttemptNumber(1);
    setAttemptHistory([]);
    setResult(null);
  };

  // Canvas Evaluation Handler
  const handleEvaluateCanvas = async (imageBlob, strokesData) => {
    if (!selectedItem) return;
    setEvaluating(true);
    setResult(null);

    try {
      const data = await visionService.evaluateCanvas(
        imageBlob,
        selectedItem.char,
        mode,
        currentLanguage,
        attemptNumber,
        strokesData
      );
      setResult(data);

      setAttemptHistory((prev) => [
        ...prev,
        { attempt: attemptNumber, score: data.overall_score, is_correct: data.is_correct }
      ]);
      setAttemptNumber((prev) => prev + 1);

      if (data.overall_score >= 85) {
        triggerCelebration();
      }
      refreshUser();
    } catch (err) {
      console.error('Handwriting evaluation error:', err);
      setResult({
        target: selectedItem?.char || 'அ',
        detected: 'Unclear',
        is_correct: false,
        overall_score: 50,
        character_score: 50,
        shape_score: 50,
        stroke_score: 50,
        alignment_score: 50,
        recognition_status: 'UNCERTAIN',
        feedback_type: 'incorrect',
        specific_feedback: 'Aiyayo Kanna! Could not process the drawing. Please try writing again inside the box.',
        mistake_explanation: 'Make sure your strokes are clearly visible inside the writing area.',
        encouragement: "Let's try drawing together!"
      });
    } finally {
      setEvaluating(false);
    }
  };

  // Audio Pronunciation Player
  const playAudioHint = (text) => {
    try {
      const url = voiceService.getSpeakAudioUrl(text, currentLanguage);
      const audio = new Audio(url);
      audio.play().catch((e) => console.warn(e));
    } catch (e) {
      console.warn(e);
    }
  };

  // Camera handling for optional photo mode
  const startCamera = async () => {
    setCapturedImage(null);
    setSelectedFile(null);
    setResult(null);
    setCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera error:', err);
      alert('Camera access denied. Please use on-screen canvas or upload an image file!');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      setCapturedImage(URL.createObjectURL(blob));
      setSelectedFile(blob);
      stopCamera();
    }, 'image/png');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera();
      setSelectedFile(file);
      setCapturedImage(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!selectedFile) return;
    setEvaluating(true);
    setResult(null);

    try {
      const data = await visionService.analyzeHandwriting(
        selectedFile,
        selectedItem?.char || '',
        mode,
        currentLanguage
      );
      setResult({
        target: selectedItem?.char || 'Letter',
        detected: data.detected_text,
        is_correct: data.is_correct,
        overall_score: data.score,
        character_score: data.score,
        shape_score: data.score,
        stroke_score: data.score,
        alignment_score: data.score,
        recognition_status: data.recognition_status,
        feedback_type: data.is_correct ? 'correct' : 'incorrect',
        specific_feedback: data.feedback,
        mistake_explanation: data.mistake_explanation || 'Ensure high lighting and clear focus.',
        encouragement: 'Keep practicing in your notebook!'
      });
      if (data.score >= 80) triggerCelebration();
      refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-700 uppercase tracking-wider mb-1">
            <Link to="/" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span>•</span>
            <span>Handwriting Lab</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-950 tracking-tight">
            ✍️ AI Native Handwriting Tutor
          </h1>
          <p className="text-sm font-medium text-stone-600">
            Practice writing {currentLanguage} characters, words, and sentences with stroke-level AI guidance!
          </p>
        </div>

        {/* Practice Mode Selector */}
        <div className="flex bg-amber-100/80 p-1 rounded-2xl border border-amber-300 self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => { setMode('guided'); setResult(null); }}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all ${
              mode === 'guided' ? 'bg-white text-amber-900 shadow-sm' : 'text-stone-600'
            }`}
          >
            💡 Guided
          </button>
          <button
            type="button"
            onClick={() => { setMode('free'); setResult(null); }}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all ${
              mode === 'free' ? 'bg-white text-amber-900 shadow-sm' : 'text-stone-600'
            }`}
          >
            📝 Free Write
          </button>
          <button
            type="button"
            onClick={() => { setMode('camera'); setResult(null); }}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all ${
              mode === 'camera' ? 'bg-white text-amber-900 shadow-sm' : 'text-stone-600'
            }`}
          >
            📷 Notebook
          </button>
        </div>
      </div>

      {/* Dynamic Curriculum Level Browser */}
      <CurriculumBrowser
        language={currentLanguage}
        curriculum={curriculum}
        selectedItem={selectedItem}
        onSelectItem={handleSelectItem}
        activeLevel={activeLevel}
        onSelectLevel={handleSelectLevel}
      />

      {/* Target Guide Banner */}
      {selectedItem && (
        <div className="bg-gradient-to-r from-amber-100/80 to-orange-100/80 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center min-w-[75px] h-[75px] rounded-2xl bg-white border-2 border-amber-400 shadow-inner">
              <span className="text-4xl font-black text-amber-900 select-none">
                {selectedItem.char}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black text-amber-950">
                  Target: '{selectedItem.char}' ({selectedItem.transliteration})
                </span>
                <button
                  type="button"
                  onClick={() => playAudioHint(selectedItem.char)}
                  className="p-1.5 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-900 transition-all shadow-xs"
                  title="Hear Pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-stone-600 mt-0.5">
                Meaning: <strong className="text-amber-900">{selectedItem.meaning}</strong> ({selectedItem.example_word})
              </p>
            </div>
          </div>


        </div>
      )}

      {/* Main Interactive Stage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Canvas or Camera */}
        <div className="bg-white border-2 border-amber-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-amber-950 mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span>{mode === 'camera' ? 'Notebook Camera Mode' : 'On-Screen Interactive Canvas'}</span>
            </h3>

            {mode === 'camera' ? (
              <div className="space-y-4">
                {cameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  </div>
                ) : capturedImage ? (
                  <div className="relative rounded-2xl overflow-hidden bg-stone-100 aspect-[4/3] flex items-center justify-center border border-amber-200">
                    <img src={capturedImage} alt="Captured notebook" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 aspect-[4/3] flex flex-col items-center justify-center p-6 text-center">
                    <ImageIcon className="w-12 h-12 text-amber-300 mb-2" />
                    <p className="text-sm font-bold text-stone-700">No notebook photo captured yet</p>
                    <p className="text-xs text-stone-500 mt-1">Take a photo of your written notebook page.</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {cameraActive ? (
                    <>
                      <button type="button" onClick={capturePhoto} className="flex-1 btn-primary">
                        <Camera className="w-4 h-4" /> Snap Photo
                      </button>
                      <button type="button" onClick={stopCamera} className="btn-secondary">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={startCamera} className="flex-1 btn-primary">
                        <Camera className="w-4 h-4" /> Open Camera
                      </button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary">
                        <Upload className="w-4 h-4" /> Upload
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </>
                  )}

                  {capturedImage && !cameraActive && (
                    <button type="button" onClick={handleAnalyzePhoto} disabled={evaluating} className="w-full btn-primary bg-emerald-600 hover:bg-emerald-700">
                      {evaluating ? 'Analyzing Photo...' : 'Analyze Notebook Photo ✨'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <HandwritingCanvas
                targetItem={selectedItem}
                mode={mode}
                onEvaluate={handleEvaluateCanvas}
                evaluating={evaluating}
              />
            )}
          </div>
        </div>

        {/* Right Column: AI Tutoring Review & Multi-Component Scorecard */}
        <div className="bg-amber-50/60 border-2 border-amber-300/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black text-amber-950 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>Ammachi's AI Tutoring Feedback</span>
            </h3>

            {evaluating ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-10 h-10 text-amber-600 animate-spin" />
                <p className="text-base font-extrabold text-amber-950">
                  Evaluating stroke geometry & trajectory match...
                </p>
                <p className="text-xs font-semibold text-stone-600 max-w-xs">
                  Checking shape similarity, stroke counts, and box alignment.
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Result State Banner */}
                <div className={`p-4 rounded-2xl flex items-center justify-between border-2 ${
                  result.overall_score >= 85
                    ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950'
                    : result.overall_score >= 60
                    ? 'bg-amber-100/80 border-amber-400 text-amber-950'
                    : 'bg-orange-100/80 border-orange-400 text-orange-950'
                }`}>
                  <div className="flex items-center gap-3">
                    {result.overall_score >= 85 ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-7 h-7 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-extrabold text-base block">
                        {result.overall_score >= 85
                          ? "🎉 Sabash! Excellent Writing!"
                          : result.overall_score >= 60
                          ? "⚠️ Almost There, Kanna!"
                          : "🔄 Let's Practice Again!"}
                      </span>
                      <span className="text-xs font-semibold opacity-90 block">
                        Target: <strong>{result.target}</strong> • Status: <strong>{result.recognition_status}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl font-black">{result.overall_score}</span>
                    <span className="text-xs font-bold block opacity-80">/ 100</span>
                  </div>
                </div>

                {/* Multi-Component Score Breakdown */}
                <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2.5">
                  <span className="text-xs font-extrabold text-stone-700 uppercase tracking-wider block">
                    Measurement Breakdown:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>Character Match</span>
                        <span>{result.character_score}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${result.character_score}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>Shape Similarity</span>
                        <span>{result.shape_score}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${result.shape_score}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>Stroke Trajectory</span>
                        <span>{result.stroke_score}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${result.stroke_score}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-stone-600 mb-1">
                        <span>Centering / Alignment</span>
                        <span>{result.alignment_score}%</span>
                      </div>
                      <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${result.alignment_score}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Speech Bubble Feedback */}
                <SpeechBubble
                  title="Ammachi Says:"
                  text={result.specific_feedback}
                />

                {/* Specific Stroke Measurement Tip */}
                {result.mistake_explanation && (
                  <div className="p-3.5 bg-white border border-amber-200 rounded-2xl text-xs sm:text-sm text-stone-700 font-medium">
                    💡 <strong className="text-amber-900">Measurement Tip:</strong> {result.mistake_explanation}
                  </div>
                )}

                {/* Attempt Progression Bar */}
                {attemptHistory.length > 0 && (
                  <div className="p-3 bg-amber-100/60 border border-amber-200 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Attempt Progression:</span>
                    <div className="flex items-center gap-1.5">
                      {attemptHistory.map((h, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 rounded-md text-[11px] ${
                            h.score >= 85 ? 'bg-emerald-500 text-white font-extrabold' : 'bg-white border border-amber-300'
                          }`}
                        >
                          A{h.attempt}: {h.score}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-2">
                <span className="text-5xl">👵✍️</span>
                <p className="text-base font-bold text-amber-950">Ammachi is ready to review your writing!</p>
                <p className="text-xs text-stone-500 max-w-xs">
                  Draw '{selectedItem?.char}' inside the writing canvas on the left and click <strong>Check Writing ✨</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          {result && (
            <div className="mt-5 pt-4 border-t border-amber-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => playAudioHint(result.specific_feedback)}
                className="py-2 px-3 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>Hear Feedback</span>
              </button>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="btn-primary py-2 px-4 text-xs font-bold"
                >
                  Try Again 🔄
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};
