'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Mic, Square, ArrowRight, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Question {
    id: string;
    text: string;
}

export default function InterviewPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/questions')
            .then(res => res.json())
            .then(data => {
                if (data.questions) setQuestions(data.questions);
            });
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Mic Error:", e);
        }
    }, []);

    const speakQuestion = useCallback((text: string) => {
        if (typeof window === 'undefined') return;
        window.speechSynthesis.cancel();

        const voices = window.speechSynthesis.getVoices();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;

        if (voices.length > 0) {
            const preferredVoice = voices.find(v => v.lang.includes('en-IN')) || voices[0];
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            startRecording();
        };

        window.speechSynthesis.speak(utterance);
    }, [startRecording]);

    useEffect(() => {
        if (questions.length > 0 && currentIndex < questions.length && !audioBlob) {
            const text = questions[currentIndex].text;
            const timer = setTimeout(() => speakQuestion(text), 800);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, questions, audioBlob, speakQuestion]);

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const submitAnswer = async () => {
        if (!audioBlob) return;
        setIsProcessing(true);

        const formData = new FormData();
        formData.append('audio', audioBlob, 'answer.webm');
        formData.append('questionId', questions[currentIndex].id);

        try {
            const res = await fetch('/api/answer', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                setAudioBlob(null);
                if (currentIndex < questions.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                } else {
                    alert("Survey Completed! Thank you.");
                    router.push('/farmer/dashboard');
                }
            } else {
                alert("Failed to save answer. Try again.");
            }
        } catch (e) {
            console.error(e);
            alert("Error uploading.");
        }

        setIsProcessing(false);
    };

    if (questions.length === 0) return <div className="p-10 text-center">Loading questions...</div>;

    const currentQuestion = questions[currentIndex];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-8 space-y-8 text-center border border-slate-100">
                <div className="space-y-4">
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Question {currentIndex + 1} / {questions.length}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
                        {currentQuestion.text}
                    </h1>
                </div>

                <div className="py-8 flex justify-center">
                    {/* State: Speaking */}
                    {isSpeaking && (
                        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                            <Volume2 size={40} className="text-blue-600" />
                        </div>
                    )}

                    {/* State: Ready to Record */}
                    {!isSpeaking && !isRecording && !audioBlob && (
                        <Button onClick={startRecording} className="w-24 h-24 rounded-full bg-emerald-600 hover:bg-emerald-700 shadow-2xl flex flex-col items-center justify-center gap-2">
                            <Mic size={32} />
                            <span className="text-xs">Record</span>
                        </Button>
                    )}

                    {/* State: Recording */}
                    {isRecording && (
                        <Button onClick={stopRecording} className="w-24 h-24 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl flex flex-col items-center justify-center gap-2 animate-pulse">
                            <Square size={32} fill="currentColor" />
                            <span className="text-xs">Stop</span>
                        </Button>
                    )}

                    {/* State: Review */}
                    {audioBlob && !isRecording && (
                        <div className="space-y-4 w-full">
                            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                            <div className="flex gap-4">
                                <Button onClick={() => setAudioBlob(null)} variant="outline" className="flex-1">Retry</Button>
                                <Button onClick={submitAnswer} isLoading={isProcessing} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                                    Next <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-sm text-slate-400">
                    {isSpeaking ? "Listening to question..." : isRecording ? "Recording your answer..." : "Review your answer"}
                </p>
            </div>
        </div>
    );
}
