import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Modal } from '../common';

/**
 * MessageComposer Component
 * 
 * A comprehensive message composer with text input, formatting options,
 * file attachment capability, typing indicators, and draft message saving.
 * Supports rich text editing, emoji picker, and message templates.
 * 
 * @param {Object} props - Component props
 * @param {string} props.threadId - Thread ID for the message
 * @param {Function} props.onSend - Callback for message sending
 * @param {Function} props.onTyping - Callback for typing indicator
 * @param {Function} props.onDraftSave - Callback for draft saving
 * @param {string} props.placeholder - Input placeholder text
 * @param {boolean} props.disabled - Disable composer
 * @param {boolean} props.showFormatting - Show formatting options
 * @param {boolean} props.showAttachments - Show attachment options
 * @param {boolean} props.showTemplates - Show template options
 * @param {boolean} props.showEmoji - Show emoji picker
 * @param {Object} props.replyTo - Message being replied to
 * @param {string} props.initialDraft - Initial draft content
 * @returns {JSX.Element} MessageComposer component
 */
const MessageComposer = ({
  threadId,
  onSend,
  onTyping,
  onDraftSave,
  placeholder = 'Type your message...',
  disabled = false,
  showFormatting = true,
  showAttachments = true,
  showTemplates = true,
  showEmoji = true,
  replyTo = null,
  initialDraft = '',
}) => {
  // State management
  const [message, setMessage] = useState(initialDraft);
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [formatting, setFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
  });
  const [draftSaved, setDraftSaved] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  
  // Refs
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Auto-save draft
  useEffect(() => {
    if (!message.trim() || !onDraftSave) return;
    
    const timeout = setTimeout(() => {
      onDraftSave({
        threadId,
        content: message,
        attachments,
        replyTo,
        timestamp: new Date().toISOString(),
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 2000);
    
    return () => clearTimeout(timeout);
  }, [message, attachments, threadId, replyTo, onDraftSave]);
  
  // Handle text input change
  const handleTextChange = (value) => {
    setMessage(value);
    
    // Handle typing indicator
    if (onTyping) {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      onTyping(true);
      
      const timeout = setTimeout(() => {
        onTyping(false);
      }, 1000);
      
      setTypingTimeout(timeout);
    }
  };
  
  // Handle message send
  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;
    
    try {
      setSending(true);
      
      const messageData = {
        threadId,
        content: message.trim(),
        attachments,
        replyTo: replyTo?._id,
        messageType: 'text',
      };
      
      await onSend(messageData);
      
      // Reset form
      setMessage('');
      setAttachments([]);
      setFormatting({
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        code: false,
      });
      
      // Clear draft
      if (onDraftSave) {
        onDraftSave(null);
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
      setShowAttachmentModal(false);
      setShowTemplateModal(false);
      setShowEmojiPicker(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (files) => {
    const newAttachments = Array.from(files).map(file => ({
      file,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };
  
  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  
  // Apply text formatting
  const applyFormatting = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    
    let formattedText = '';
    
    switch (type) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        break;
      default:
        formattedText = selectedText;
    }
    
    const newMessage = message.substring(0, start) + formattedText + message.substring(end);
    setMessage(newMessage);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };
  
  // Insert emoji
  const insertEmoji = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + emoji + message.substring(end);
    
    setMessage(newMessage);
    setShowEmojiPicker(false);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };
  
  // Use template
  const useTemplate = (template) => {
    setMessage(template.content);
    setShowTemplateModal(false);
    textareaRef.current?.focus();
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Common emojis
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪'
  ];
  
  // Sample templates
  const sampleTemplates = [
    {
      id: 1,
      name: 'Greeting',
      content: 'Hello! How can I help you today?',
      category: 'general',
    },
    {
      id: 2,
      name: 'Follow Up',
      content: 'Just following up on our previous conversation. Is there anything else you need assistance with?',
      category: 'follow-up',
    },
    {
      id: 3,
      name: 'Thank You',
      content: 'Thank you for your patience. I appreciate your understanding.',
      category: 'appreciation',
    },
    {
      id: 4,
      name: 'Closing',
      content: 'Is there anything else I can help you with today? If not, I\'ll go ahead and close this conversation.',
      category: 'closing',
    },
  ];
  
  return (
    <div className="message-composer border rounded-lg bg-white">
      {/* Reply indicator */}
      {replyTo && (
        <div className="border-b px-4 py-2 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Replying to:</span> {replyTo.sender?.name || replyTo.sender?.email}
              <div className="text-xs opacity-75 mt-1">{replyTo.content.substring(0, 100)}...</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* Clear reply */}}
            >
              ✕
            </Button>
          </div>
        </div>
      )}
      
      {/* Formatting toolbar */}
      {showFormatting && (
        <div className="border-b px-2 py-1 flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('bold')}
            disabled={disabled}
            className="font-bold"
          >
            B
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('italic')}
            disabled={disabled}
            className="italic"
          >
            I
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('underline')}
            disabled={disabled}
            className="underline"
          >
            U
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('strikethrough')}
            disabled={disabled}
            className="line-through"
          >
            S
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyFormatting('code')}
            disabled={disabled}
            className="font-mono"
          >
            {'</>'}
          </Button>
          
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          
          {/* Emoji picker */}
          {showEmoji && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled}
              >
                😊
              </Button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border rounded-lg shadow-lg p-2 z-10">
                  <div className="grid grid-cols-8 gap-1">
                    {commonEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        className="p-2 hover:bg-gray-100 rounded text-lg"
                        onClick={() => insertEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Attachments */}
          {showAttachments && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                📎
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </>
          )}
          
          {/* Templates */}
          {showTemplates && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
              disabled={disabled}
            >
              📝
            </Button>
          )}
        </div>
      )}
      
      {/* Message input */}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || sending}
          className="w-full resize-none border-0 focus:ring-0 text-sm"
          rows={4}
        />
      </div>
      
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="border-t px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-gray-100 rounded-lg px-3 py-2"
              >
                {attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.name}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <span className="text-lg">📄</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{attachment.name}</div>
                  <div className="text-xs text-gray-500">{attachment.size}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="border-t px-4 py-2 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          {draftSaved && (
            <span className="text-green-600">Draft saved</span>
          )}
          {!draftSaved && message.trim() && (
            <span>Drafting...</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </span>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending || disabled}
            loading={sending}
          >
            Send
          </Button>
        </div>
      </div>
      
      {/* Template modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Message Templates"
      >
        <div className="space-y-2">
          {sampleTemplates.map((template) => (
            <div
              key={template.id}
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => useTemplate(template)}
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-sm text-gray-600 mt-1">{template.content}</div>
              <div className="text-xs text-gray-500 mt-1 capitalize">{template.category}</div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default MessageComposer;