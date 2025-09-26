import React, { useState } from 'react';
import { Conversation, Message } from './Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { MessageSquare, Send, User } from 'lucide-react';

interface MessagingCenterProps {
  conversations: Conversation[];
  currentUserId: string;
  currentUserName: string;
  onSendMessage: (conversationId: string, content: string) => void;
}

export function MessagingCenter({ 
  conversations, 
  currentUserId, 
  currentUserName, 
  onSendMessage 
}: MessagingCenterProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null
  );
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<{ [conversationId: string]: Message[] }>({
    // Mock messages for demo - in real app this would come from backend
    'conv1': [
      {
        id: 'msg1',
        conversationId: 'conv1',
        senderId: 'other_user',
        receiverId: currentUserId,
        content: 'Hi! I have a question about what to bring to the beekeeping class.',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      },
      {
        id: 'msg2',
        conversationId: 'conv1',
        senderId: currentUserId,
        receiverId: 'other_user',
        content: 'Hi there! I\'ll send you a detailed list. You\'ll mainly need protective gear which I can provide if needed.',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      },
      {
        id: 'msg3',
        conversationId: 'conv1',
        senderId: 'other_user',
        receiverId: currentUserId,
        content: 'That would be great! Should I bring my own lunch or will food be provided?',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      }
    ]
  });

  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const conversationMessages = selectedConversation ? messages[selectedConversation] || [] : [];

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      conversationId: selectedConversation,
      senderId: currentUserId,
      receiverId: selectedConv?.participants.find(p => p !== currentUserId) || '',
      content: messageInput.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => ({
      ...prev,
      [selectedConversation]: [...(prev[selectedConversation] || []), newMessage]
    }));

    onSendMessage(selectedConversation, messageInput.trim());
    setMessageInput('');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getOtherParticipantName = (conversation: Conversation) => {
    return conversation.participantNames.find(name => name !== currentUserName) || 'Unknown';
  };

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No conversations yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Messages will appear here when you book classes or interact with students/hosts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-[#3c4f21] flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedConversation === conversation.id
                    ? 'bg-[#556B2F] text-white'
                    : 'hover:bg-[#f8f9f6]'
                }`}
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {getOtherParticipantName(conversation)}
                    </span>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge className="bg-[#c54a2c] text-white">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
                
                {conversation.className && (
                  <p className={`text-sm mb-1 ${
                    selectedConversation === conversation.id ? 'text-white/80' : 'text-[#556B2F]'
                  }`}>
                    {conversation.className}
                  </p>
                )}
                
                {conversation.lastMessage && (
                  <div>
                    <p className={`text-sm truncate ${
                      selectedConversation === conversation.id ? 'text-white/90' : 'text-gray-600'
                    }`}>
                      {conversation.lastMessage.content}
                    </p>
                    <p className={`text-xs mt-1 ${
                      selectedConversation === conversation.id ? 'text-white/70' : 'text-gray-400'
                    }`}>
                      {formatTime(conversation.lastMessage.createdAt)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card className="lg:col-span-2">
        {selectedConv ? (
          <>
            <CardHeader className="border-b">
              <CardTitle className="text-[#3c4f21] flex items-center gap-2">
                <User className="h-5 w-5" />
                {getOtherParticipantName(selectedConv)}
              </CardTitle>
              {selectedConv.className && (
                <p className="text-sm text-[#556B2F]">Re: {selectedConv.className}</p>
              )}
            </CardHeader>
            
            <CardContent className="flex flex-col h-[440px]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        message.senderId === currentUserId
                          ? 'bg-[#556B2F] text-white'
                          : 'bg-[#f8f9f6] text-[#3c4f21]'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === currentUserId ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="bg-[#556B2F] hover:bg-[#3c4f21] text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a conversation to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}