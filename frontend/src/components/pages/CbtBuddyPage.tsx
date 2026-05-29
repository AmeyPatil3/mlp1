import React, { useState, useRef, useEffect } from 'react';
import { chatWithCbtBuddy, ChatMessageParam } from '../../mood/services/geminiService';
import { useAuth } from '../../context/AuthContext';
import { BrainCircuitIcon } from '../ui/icons';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

const CbtBuddyPage: React.FC = () => {
    const { auth } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'buddy-init',
            role: 'model',
            text: `Hello ${auth?.user?.fullName || 'there'}! I'm CBT Buddy, your private, empathetic AI companion. I'm here to offer a safe, completely anonymous space to reflect, examine thinking patterns, and celebrate positive wins today.

What is on your mind? Or feel free to select one of the reflection cards below to start a guided session.`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleSend = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMessage: Message = {
            id: `msg-user-${Date.now()}`,
            role: 'user',
            text: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Map messages state to the ChatMessageParam structure expected by the service
            const apiHistory: ChatMessageParam[] = messages
                .concat(userMessage)
                .filter(m => m.id !== 'buddy-init')
                .map(m => ({
                    role: m.role,
                    text: m.text
                }));

            const replyText = await chatWithCbtBuddy(apiHistory);

            const buddyMessage: Message = {
                id: `msg-buddy-${Date.now()}`,
                role: 'model',
                text: replyText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, buddyMessage]);
        } catch (error) {
            console.error('Failed to get companion response:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePromptCard = (promptText: string, messageText: string) => {
        setInput(promptText);
        handleSend(messageText);
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] bg-white text-gray-800 rounded-2xl border border-gray-200 shadow-lg overflow-hidden relative">
            
            {/* Elegant Ambient Glowing Background Lights */}
            <div className="absolute top-[-10%] left-[-20%] w-[350px] h-[350px] rounded-full bg-blue-100/40 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[350px] h-[350px] rounded-full bg-teal-100/40 blur-[120px] pointer-events-none" />

            {/* Premium Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 flex-shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-teal-500 rounded-xl shadow-lg relative overflow-hidden animate-pulse">
                        <BrainCircuitIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600">CBT Buddy</h2>
                        <p className="text-xs text-gray-500 font-medium flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
                            Empathetic CBT Companion • Private
                        </p>
                    </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full self-start sm:self-auto">
                    No logs saved • Anonymous
                </div>
            </div>

            {/* Chat Body & Quick Action Cards */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 z-10 flex flex-col justify-between">
                
                {/* Scrollable Conversation Section */}
                <div className="space-y-4 flex-1">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3.5 leading-relaxed text-sm shadow-sm transition-all duration-300 ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-800 border border-gray-200/60 rounded-bl-none'
                                }`}
                            >
                                <p className="whitespace-pre-line">{msg.text}</p>
                                <span className={`block text-[10px] mt-2.5 text-right font-medium ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Reflecting Typing Indicator */}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100 border border-gray-200/60 rounded-2xl rounded-bl-none px-5 py-4 text-sm shadow-sm flex items-center space-x-2">
                                <span className="text-xs text-gray-500 mr-2 font-medium">CBT Buddy is reflecting</span>
                                <span className="flex space-x-1.5 items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce delay-75" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce delay-150" />
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-bounce delay-300" />
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Inline Premium Prompt Cards (Only show when conversation has few entries to avoid clutter) */}
                {messages.length <= 2 && (
                    <div className="mt-8 pt-4 border-t border-gray-200/60">
                        <p className="text-xs font-semibold text-gray-400 mb-3 tracking-wide uppercase">Reflection templates</p>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            
                            <button
                                onClick={() => handlePromptCard(
                                    "Journaling a daily win...",
                                    "I want to share a daily win or positive moment that happened today. Let's celebrate it and write a quick reflection win card!"
                                )}
                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-blue-500 p-4 rounded-xl text-left transition-all duration-300 group shadow-sm"
                            >
                                <div className="text-lg mb-1.5 group-hover:scale-110 transition-transform duration-300">🌟</div>
                                <h4 className="font-bold text-sm text-blue-600 group-hover:text-blue-500 mb-1">Journal a Daily Win</h4>
                                <p className="text-xs text-gray-500 leading-normal">Reflect on a positive moment or personal victory, no matter how small.</p>
                            </button>

                            <button
                                onClick={() => handlePromptCard(
                                    "Exploring stress...",
                                    "I'm feeling a bit anxious or stressed right now. Can we map my thoughts using a gentle CBT cognitive restructuring exercise?"
                                )}
                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-teal-500 p-4 rounded-xl text-left transition-all duration-300 group shadow-sm"
                            >
                                <div className="text-lg mb-1.5 group-hover:scale-110 transition-transform duration-300">🧘</div>
                                <h4 className="font-bold text-sm text-teal-600 group-hover:text-teal-500 mb-1">Explore Stressors</h4>
                                <p className="text-xs text-gray-500 leading-normal">Examine worry loops or anxious thinking patterns with gentle coaching.</p>
                            </button>

                            <button
                                onClick={() => handlePromptCard(
                                    "Writing gratitude journal...",
                                    "I want to practice three points of gratitude today. Can you guide me through a gratitude check-in?"
                                )}
                                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-indigo-500 p-4 rounded-xl text-left transition-all duration-300 group shadow-sm"
                            >
                                <div className="text-lg mb-1.5 group-hover:scale-110 transition-transform duration-300">📝</div>
                                <h4 className="font-bold text-sm text-indigo-600 group-hover:text-indigo-500 mb-1">Gratitude Check-in</h4>
                                <p className="text-xs text-gray-500 leading-normal">Focus on three simple things you feel grateful for to shift perspective.</p>
                            </button>

                        </div>
                    </div>
                )}
            </div>

            {/* Input Form Panel */}
            <div className="p-4 bg-white border-t border-gray-200 z-10 flex-shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend(input);
                    }}
                    className="flex space-x-3"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Share your feelings, anxious loops, or daily wins..."
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 placeholder-gray-400 text-sm transition-all disabled:opacity-50"
                        aria-label="CBT chat input"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl disabled:bg-blue-300 disabled:text-blue-50 transition-all duration-300 shadow-md text-sm flex-shrink-0"
                        aria-label="Send message to CBT Buddy"
                    >
                        Reflect
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CbtBuddyPage;
