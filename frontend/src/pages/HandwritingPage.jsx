import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handwritingService } from '../services/handwritingService';
import { AmmachiMascot } from '../components/common/AmmachiMascot';

const LANGUAGES = [
  { code: 'Tamil', name: 'Tamil', flag: '🇮🇳' },
  { code: 'Hindi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'Telugu', name: 'Telugu', flag: '🇮🇳' },
  { code: 'Malayalam', name: 'Malayalam', flag: '🇮🇳' }
];

export const HandwritingPage = () => {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState('Tamil');
  const [letters, setLetters] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  // Fetch letters when language changes
  useEffect(() => {
    const fetchLetters = async () => {
      setLoading(true);
      setError('');
      setResult(null);
      setSelectedLetter(null);
      try {
        const data = await handwritingService.getLetters(selectedLang);
        setLetters(data.letters || []);
      } catch (err) {
        setError('Failed to load letters: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLetters();
  }, [selectedLang]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset input so same file can be selected again
    event.target.value = '';
    
    if (!selectedLetter) {
      setError('Please select a letter to write first.');
      return;
    }
    
    setEvaluating(true);
    setError('');
    setResult(null);
    
    try {
      const evaluation = await handwritingService.evaluateHandwriting(selectedLetter.id, file);
      setResult(evaluation);
    } catch (err) {
      setError(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20 pt-8 px-4 flex justify-center">
      <div className="max-w-md w-full space-y-6">
        <button onClick={() => navigate('/')} className="flex items-center text-stone-500 font-bold text-sm hover:text-stone-800 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-amber-200">
          <div className="flex flex-col items-center mb-6 text-center">
            <AmmachiMascot size="lg" className="mb-4" />
            <h1 className="text-2xl font-black text-amber-950 tracking-tight">Handwriting Practice</h1>
            <p className="text-sm font-semibold text-stone-500 mt-1">Write letters in your notebook and let Ammachi check them!</p>
          </div>

          <div className="space-y-6">
            {/* Language Selection */}
            <div>
              <label className="block text-xs font-black text-stone-600 uppercase mb-2">Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={`px-4 py-2 rounded-xl border-2 font-bold transition-all ${
                      selectedLang === lang.code
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-amber-200'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Letter Selection */}
            <div>
              <label className="block text-xs font-black text-stone-600 uppercase mb-2">Select a Letter to Practice</label>
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-500" /></div>
              ) : letters.length === 0 ? (
                <p className="text-sm text-stone-500 italic py-2">No letters available for this language yet.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {letters.map(letter => (
                    <button
                      key={letter.id}
                      onClick={() => {
                        setSelectedLetter(letter);
                        setResult(null);
                        setError('');
                      }}
                      className={`text-2xl py-3 rounded-xl border-2 font-black transition-all ${
                        selectedLetter?.id === letter.id
                          ? 'border-amber-500 bg-amber-50 text-amber-900 transform scale-105'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-amber-200'
                      }`}
                    >
                      {letter.character}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-sm font-bold">
                {error}
              </div>
            )}

            {/* Action Area */}
            {selectedLetter && !result && !evaluating && (
              <div className="bg-amber-100 p-6 rounded-2xl border-2 border-amber-300 text-center animate-in fade-in zoom-in-95">
                <p className="text-sm font-black text-amber-900 mb-2 uppercase tracking-wide">Write this letter clearly:</p>
                <div className="text-6xl font-black text-amber-950 mb-6 drop-shadow-sm">
                  {selectedLetter.character}
                </div>
                
                <input 
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Take Photo & Check
                </button>
              </div>
            )}

            {/* Evaluating State */}
            {evaluating && (
              <div className="bg-stone-50 p-8 rounded-2xl border-2 border-stone-200 text-center flex flex-col items-center">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
                <p className="font-bold text-stone-600">Ammachi is reading your handwriting...</p>
              </div>
            )}

            {/* Result Area */}
            {result && !evaluating && (
              <div className={`p-6 rounded-2xl border-2 text-center animate-in zoom-in-95 ${
                result.status === 'correct' ? 'bg-emerald-50 border-emerald-300' : 
                result.status === 'incorrect' ? 'bg-rose-50 border-rose-300' :
                'bg-amber-50 border-amber-300'
              }`}>
                {result.status === 'correct' ? (
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                ) : result.status === 'incorrect' ? (
                  <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                ) : (
                  <Camera className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                )}
                
                <h3 className={`text-xl font-black mb-1 ${
                  result.status === 'correct' ? 'text-emerald-800' : 
                  result.status === 'incorrect' ? 'text-rose-800' :
                  'text-amber-800'
                }`}>
                  {result.status === 'correct' ? '✅ Sabash! Correct!' : 
                   result.status === 'incorrect' ? '❌ Try Again Kanna' : 
                   result.status === 'ocr_unavailable' ? '⚠️ Couldn\'t check the image' :
                   '📷 Couldn\'t recognize the letter'}
                </h3>
                
                <p className="font-bold text-stone-700 mb-4 text-sm">{result.feedback}</p>
                
                {result.score !== null && (
                  <div className="inline-block bg-white px-4 py-2 rounded-lg font-black text-amber-600 border border-stone-200 mb-6 shadow-sm">
                    Score: {result.score}
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setResult(null);
                    setError('');
                  }}
                  className="w-full py-3 bg-white text-stone-800 border-2 border-stone-200 rounded-xl font-black text-base hover:bg-stone-50 transition-colors"
                >
                  Practice Another Letter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
