
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { Profile, Message, Conversation, Partner } from '../types';
import { Search, Send, User, MessageSquare, Loader2, ArrowLeft, Building2, Briefcase, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessagingProps {
  currentUserId: string;
  partners: Partner[];
}

const Messaging: React.FC<MessagingProps> = ({ currentUserId, partners }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    
    // In a full proxy architecture, Realtime should be handled via WebSockets on the Node.js server.
    // To strictly follow the "no direct communication with DB" rule, we remove Supabase Subscriptions.
    // Temporary solution: Polling every 10 seconds.
    const interval = setInterval(() => {
      fetchConversations();
      if (activeConversation) {
        fetchMessages(activeConversation.otherParticipant.id);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeConversation?.otherParticipant.id, currentUserId]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.otherParticipant.id);
      markAsRead(activeConversation.otherParticipant.id);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const msgsRaw = await apiService.fetchTable('messages');
      // fetchTable on backend is already filtered by currentUserId via RLS and proxy token
      
      const msgs: Message[] = (msgsRaw || [])
        .filter((m: any) => m.senderId === currentUserId || m.receiverId === currentUserId);

      const convMap = new Map<string, Conversation>();
      
      // We sort messages by timestamp descending to pick the last message for each conversation
      const sortedMsgs = [...msgs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      for (const msg of sortedMsgs) {
        const otherId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
        if (!convMap.has(otherId)) {
          const profilesRaw = await apiService.fetchTable('profiles');
          const profileRaw = Array.isArray(profilesRaw) ? profilesRaw.find(p => p.id === otherId) : null;
          
          if (profileRaw) {
            const profile: Profile = profileRaw;

            convMap.set(otherId, {
              otherParticipant: profile,
              lastMessage: msg,
              unreadCount: msgs.filter(m => m.senderId === otherId && m.receiverId === currentUserId && !m.isRead).length
            });
          }
        }
      }

      setConversations(Array.from(convMap.values()));
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (otherId: string) => {
    try {
      const msgsRaw = await apiService.fetchTable('messages');
      // The proxy/RLS handles visibility. We filter locally for this specific conversation.
      const msgs: Message[] = (msgsRaw || [])
        .filter((m: any) => 
          (m.senderId === currentUserId && m.receiverId === otherId) ||
          (m.senderId === otherId && m.receiverId === currentUserId)
        )
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setMessages(msgs);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const markAsRead = async (otherId: string) => {
    try {
      fetch('/api/log', { method: 'POST', body: JSON.stringify({ event: 'markAsRead_start', otherId, currentUserId }), headers:{'Content-Type':'application/json'} });
      
      const res = await apiService.markMessagesAsRead(otherId);
      
      fetch('/api/log', { method: 'POST', body: JSON.stringify({ event: 'markAsRead_success', res }), headers:{'Content-Type':'application/json'} });
      
      // Update local state to immediately clear notification
      setConversations(prev => prev.map(conv => {
        if (conv.otherParticipant.id === otherId) {
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      }));

      // Also update messages in view if needed
      setMessages(prev => prev.map(m => {
        if (m.senderId === otherId && !m.isRead) {
          return { ...m, isRead: true };
        }
        return m;
      }));

      // Notify global layout to refresh the unread badge after a slight delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('message_read'));
      }, 500);
    } catch (err: any) {
      fetch('/api/log', { method: 'POST', body: JSON.stringify({ event: 'markAsRead_error', error: err.message }), headers:{'Content-Type':'application/json'} });
      console.error('Error marking as read:', err);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const profilesRaw = await apiService.fetchTable('profiles');
      const profiles: Profile[] = (profilesRaw || [])
        .filter((p: any) => 
          p.id !== currentUserId && 
          (p.firstName?.toLowerCase().includes(val.toLowerCase()) || 
           p.lastName?.toLowerCase().includes(val.toLowerCase()) || 
           p.email?.toLowerCase().includes(val.toLowerCase()))
        )
        .slice(0, 5);

      setSearchResults(profiles);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const startConversation = (profile: Profile) => {
    const existing = conversations.find(c => c.otherParticipant.id === profile.id);
    if (existing) {
      setActiveConversation(existing);
    } else {
      setActiveConversation({
        otherParticipant: profile,
        unreadCount: 0
      });
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    const tempId = crypto.randomUUID();
    const msgData = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: activeConversation.otherParticipant.id,
      content: content,
      timestamp: new Date().toISOString(),
      is_read: false
    };

    // Optimistic update
    const optimisticMsg: Message = {
      id: tempId,
      senderId: currentUserId,
      receiverId: activeConversation.otherParticipant.id,
      content: content,
      timestamp: msgData.timestamp,
      isRead: false
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await apiService.create('messages', msgData);
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content); // Restore message text
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="animate-spin text-slds-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
      {/* Sidebar - Conversation List */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur..."
              className="slds-input slds-input-compact pl-10 w-full"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 mt-2 overflow-hidden">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    onClick={() => startConversation(user)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {partners.find(p => p.id === user.partnerId)?.name || 'Interne CFGT'}
                        </p>
                        {user.position && (
                          <>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <p className="text-[10px] text-slate-400 italic truncate max-w-[100px]">{user.position}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <MessageSquare size={24} />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aucune conversation</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.otherParticipant.id}
                onClick={() => setActiveConversation(conv)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-all border-b border-slate-50 text-left ${activeConversation?.otherParticipant.id === conv.otherParticipant.id ? 'bg-slate-50' : ''}`}
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-slds-brand/10 text-slds-brand rounded-full flex items-center justify-center font-black text-xs">
                    {conv.otherParticipant.firstName[0]}{conv.otherParticipant.lastName[0]}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-slds-error text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-900 truncate">{conv.otherParticipant.firstName} {conv.otherParticipant.lastName}</p>
                    {conv.lastMessage && (
                      <span className="text-[8px] text-slate-400 font-bold uppercase">
                        {format(new Date(conv.lastMessage.timestamp), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[9px] font-bold text-slds-brand/70 truncate max-w-[120px]">
                      {partners.find(p => p.id === conv.otherParticipant.partnerId)?.name || 'Interne CFGT'}
                    </p>
                    {conv.otherParticipant.position && (
                      <>
                        <span className="text-slate-300 text-[9px]">•</span>
                        <p className="text-[9px] text-slate-400 italic truncate">{conv.otherParticipant.position}</p>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-1">
                    {conv.lastMessage?.content || 'Nouvelle conversation'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-50/30 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 text-slate-400">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-slds-brand text-white rounded-full flex items-center justify-center font-black text-xs shadow-lg shadow-slds-brand/20">
                  {activeConversation.otherParticipant.firstName[0]}{activeConversation.otherParticipant.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{activeConversation.otherParticipant.firstName} {activeConversation.otherParticipant.lastName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slds-brand font-bold uppercase tracking-wider">
                      {partners.find(p => p.id === activeConversation.otherParticipant.partnerId)?.name || 'Interne CFGT'}
                    </p>
                    {activeConversation.otherParticipant.position && (
                      <>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <p className="text-[10px] text-slate-400 font-medium italic">{activeConversation.otherParticipant.position}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === currentUserId;
                const showDate = idx === 0 || format(new Date(messages[idx-1].timestamp), 'yyyy-MM-dd') !== format(new Date(msg.timestamp), 'yyyy-MM-dd');
                
                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          {format(new Date(msg.timestamp), 'd MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-xs font-medium shadow-sm ${isMe ? 'bg-slds-brand text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                        <p className="leading-relaxed">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1.5">
                          <p className={`text-[8px] font-bold uppercase tracking-widest ${isMe ? 'text-white/60' : 'text-slate-400'}`}>
                            {format(new Date(msg.timestamp), 'HH:mm')}
                          </p>
                          {isMe && (
                            <div className={msg.isRead ? 'text-emerald-300' : 'text-white/30'}>
                              <CheckCheck size={10} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Écrivez votre message..."
                  className="slds-input flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="slds-button slds-button-brand !w-12 !h-12 !p-0 flex items-center justify-center rounded-2xl shadow-lg shadow-slds-brand/20 disabled:opacity-50"
                >
                  {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-20 h-20 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 flex items-center justify-center text-slate-200">
              <MessageSquare size={40} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Messagerie Interne</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 max-w-xs">
                Sélectionnez une conversation ou recherchez un collègue pour commencer à discuter.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;
