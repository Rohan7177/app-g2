"use client"; // This MUST be the very first line of the file!

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image, // Keep Image component for displaying captured thumbnails
  Platform // Used for platform-specific styling if needed
} from 'react-native-web';

// Helper component to format text with bolding and handle newlines
const FormattedText = ({ text, style, boldStyle, errorStyle }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g); // Split by **bold text** retaining the delimiters

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Render bold text
          return (
            <Text key={index} style={boldStyle}>
              {part.substring(2, part.length - 2)} {/* Remove ** */}
            </Text>
          );
        } else {
          // Render regular text, handling newlines if present
          const lines = part.split('\n');
          return lines.map((line, lineIndex) => (
            <React.Fragment key={`${index}-${lineIndex}`}>
              <Text style={errorStyle ? errorStyle : style}>{line}</Text>
              {lineIndex < lines.length - 1 && <Text>{"\n"}</Text>} {/* Add newline for line breaks */}
            </React.Fragment>
          ));
        }
      })}
    </Text>
  );
};

// SVG Icon for Chatbot (Chef Hat) - UPDATED to Chef Emoji
const ChefHatIcon = ({ size = 24 }) => (
  <Text style={{ fontSize: size, lineHeight: size, color: '#333' }}>👨‍🍳</Text>
);

// SVG Icon for User (Person Outline)
const PersonIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
      stroke="#333"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 14C7.79186 14 4.38075 16.5888 4.02097 20.6582C3.96866 21.229 4.41738 22 5.0004 22H19.0004C19.5834 22 20.0321 21.229 19.9798 20.6582C19.62 16.5888 16.2089 14 12 14Z"
      stroke="#333"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Main App Component
const App = () => {
  // State to hold chat messages
  const [messages, setMessages] = useState([]);
  // State for the text input field
  const [inputMessage, setInputMessage] = useState('');
  // Ref for scrolling the chat view to the bottom
  const scrollViewRef = useRef();
  // State to manage loading indicator during LLM call
  const [isLoading, setIsLoading] = useState(false);

  // Removed displayMessage, typingIntervalRef, and fullBotResponseRef states
  // const [displayMessage, setDisplayMessage] = useState('');
  // const typingIntervalRef = useRef(null);
  // const fullBotResponseRef = useRef(''); // Ref to store the full bot response for typing

  // Ref for the hidden file input element
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]); // Removed displayMessage from dependency array

  // Initial greeting message from Alton Brown - now instant
  useEffect(() => {
    // No more clearing typing intervals here as it's removed
    const initialText = "Greetings, inquisitive eater! I'm Alton Brown, and I'm here to demystify the ingredients in your favorite dishes. What culinary conundrum can I help you unravel today? Simply type the dish name, or upload a menu photo!";
    // Set the initial message instantly without typing effect
    setMessages([{ text: initialText, isUser: false, isBot: true, isTypingComplete: true }]);
    // No more resetting typing states here
  }, []); // Run once on component mount

  // Function to handle sending a text message (dish name)
  const handleSendTextMessage = async () => {
    const text = inputMessage.trim();
    if (!text) return; // Don't send empty messages

    // Add user's message to chat immediately
    const newUserMessage = { text: text, isUser: true };
    // No more clearing typing effect for text messages
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputMessage(''); // Clear input field

    setIsLoading(true); // Show loading indicator

    try {
      // Make API call to your Next.js backend for text-based dish name
      const response = await fetch('/api/chat', { // This is the Gemini API route
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dishName: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botResponseText = data.response;

      // Directly set the bot's response without typing effect
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: botResponseText, isUser: false, isBot: true, isTypingComplete: true },
      ]);

    } catch (error) {
      console.error("Failed to fetch from LLM:", error);
      // Add error message directly (no typing effect for errors for simplicity)
      setMessages((prevMessages) => [
        ...prevMessages,
        // Updated error message for Alton Brown's persona
        { text: "A culinary misstep has occurred! It seems there's a glitch in our data stream, and I couldn&#39;t quite retrieve that information. Let's try that again, shall we?", isUser: false, isBot: true, isError: true, isTypingComplete: true },
      ]);
      // No more clearing typing interval here
    } finally {
      setIsLoading(false); // Hide loading indicator
    }
  };

  // Function to handle image upload (triggers hidden file input)
  const handleImageUpload = () => {
    // No more clearing typing effect for image messages
    // Trigger the hidden file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Function to handle file selection from the hidden input
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => { // Made onloadend async
        const imageDataUrl = reader.result; // imageDataUrl is now correctly scoped here

        // Display the image thumbnail immediately
        setMessages((prevMessages) => [
          ...prevMessages,
          { imageUrl: imageDataUrl, isUser: true, isImage: true, isTypingComplete: true },
        ]);

        // Now, send the image to the new backend API for analysis
        setIsLoading(true); // Show loading indicator for image processing

        try {
          const response = await fetch('/api/image-chat', { // New API route for image analysis
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageDataUrl }), // imageDataUrl is now available
          });

          const data = await response.json();

          // Handle specific LLM errors (e.g., image not a menu) or general API errors
          if (!response.ok || data.isLlmError) {
            // Use the LLM's specific error message if available, otherwise a generic one
            const errorMessage = data.response || "Menu recognition failed. It seems there was a technical glitch in analyzing the image. Please try again!";
            setMessages((prevMessages) => [
              ...prevMessages,
              { text: errorMessage, isUser: false, isBot: true, isError: true, isTypingComplete: true },
            ]);
          } else {
            // Success: Display the structured dish/allergen list INSTANTLY (no typing effect)
            const botResponseText = data.response;
            setMessages((prevMessages) => [
              ...prevMessages,
              { text: botResponseText, isUser: false, isBot: true, isTypingComplete: true }, // Directly set full text
            ]);
          }
        } catch (error) {
          console.error("Failed to process image:", error);
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: "Menu recognition failed. It seems there was a technical glitch in analyzing the image. Please try again!", isUser: false, isBot: true, isError: true, isTypingComplete: true },
          ]);
        } finally {
          setIsLoading(false); // Hide loading indicator
        }
      };
      reader.readAsDataURL(file);
    }
    // Clear the input value to allow selecting the same file again
    event.target.value = '';
  };

  // Function to clear all messages
  const handleClearConversation = () => {
    // No more clearing typing intervals here
    const initialText = "Greetings, inquisitive eater! I'm Alton Brown, and I'm here to demystify the ingredients in your favorite dishes. What culinary conundrum can I help you unravel today? Simply type the dish name, or upload a menu photo!";
    // Reset the initial greeting to be instant again
    setMessages([{ text: initialText, isUser: false, isBot: true, isTypingComplete: true }]);
    // No more clearing display message state or full bot response ref
  };

  return (
    // Main container now uses absolute positioning to fill the entire parent (body/html)
    // This provides a robust base for flexbox children across devices.
    <View style={styles.container}>
      {/* Hidden file input for image selection */}
      <input
        type="file"
        accept="image/*" // Accept only image files
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }} // Hide the input element visually
      />

      {/* Header Section - Fixed at the top */}
      <View style={styles.header}>
        {/* Top Left Icon Placeholder */}
        <View style={styles.headerIconLeft}>
          <Text style={styles.placeholderIconText}>&#x2B50;</Text>
        </View>
        {/* Top Middle Title */}
        <Text style={styles.headerTitle}>Allergen Identifier</Text>
        {/* Top Right Clear Conversation Icon */}
        <TouchableOpacity onPress={handleClearConversation} style={styles.headerIconRight}>
          <Text style={styles.refreshIcon}>&#x21BB;</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Interface - This takes up all available vertical space between header and input tray */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContentContainer}
      >
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.messageBubbleContainer,
              msg.isUser ? styles.userMessageContainer : styles.botMessageContainer,
            ]}
          >
            {!msg.isUser && (
              <View style={[styles.avatarContainer, styles.botAvatarBackground]}>
                <ChefHatIcon size={24} /> {/* Changed to ChefHatIcon */}
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                msg.isUser ? styles.userBubbleSpecific : styles.botBubbleSpecific,
              ]}
            >
              {msg.isImage && msg.imageUrl ? (
                <Image
                  source={{ uri: msg.imageUrl }}
                  style={styles.imageThumbnail}
                  accessibilityLabel="Uploaded menu image thumbnail"
                  alt="Uploaded menu image thumbnail"
                  onError={(e) => console.log('Thumbnail failed to load:', e.nativeEvent.error)}
                />
              ) : (
                // Always render the full message text directly
                <FormattedText
                  text={msg.text}
                  style={styles.messageText}
                  boldStyle={styles.boldText}
                  errorStyle={msg.isError ? styles.errorMessageText : null}
                />
              )}
            </View>
            {msg.isUser && (
              <View style={[styles.avatarContainer, styles.userAvatarBackground]}>
                <PersonIcon size={24} />
              </View>
            )}
          </View>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={[styles.messageBubbleContainer, styles.botMessageContainer]}>
            <View style={[styles.avatarContainer, styles.botAvatarBackground]}>
              <ChefHatIcon size={24} /> {/* Changed to ChefHatIcon */}
            </View>
            <View style={styles.messageBubble}>
              {/* Updated loading message for Alton Brown's persona */}
              <Text style={styles.messageText}>Calibrating culinary calculations... Stand by!</Text>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Bottom Input Tray - Fixed at the bottom */}
      <View style={styles.inputTray}>
        {/* Plus Button for Image */}
        <TouchableOpacity onPress={handleImageUpload} style={styles.plusButton}>
          <Text style={styles.plusButtonText}>+</Text>
        </TouchableOpacity>

        {/* Text Input Box */}
        <TextInput
          style={styles.textInput}
          placeholder="Enter a dish name"
          placeholderTextColor="#999"
          value={inputMessage}
          onChangeText={setInputMessage}
          onSubmitEditing={handleSendTextMessage} // Allows sending with Enter key
          returnKeyType="send"
        />

        {/* Send Button */}
        <TouchableOpacity
          onPress={handleSendTextMessage}
          style={styles.sendButton}
          disabled={isLoading} // Disable send button while loading
        >
          <Text style={styles.sendButtonText}>&#x27A4;</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Stylesheet for the components
const styles = StyleSheet.create({
  container: {
    flex: 1, // This is key for flexbox to work.
    flexDirection: 'column', // Stack children vertically
    backgroundColor: '#F8F8F8', // Light background
    // IMPORTANT for reliable full-screen flexbox layout:
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    // Responsive padding for different screen sizes
    paddingHorizontal: Platform.select({
      web: {
        small: 10, // Mobile
        medium: 20, // Tablet
        large: 30, // Desktop
      },
      default: 10, // Fallback for other platforms
    }),
    maxWidth: 800, // Max width for desktop
    alignSelf: 'center', // Center the app on larger screens
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    height: 70, // Fixed height for header
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFFFFF', // White header background
    borderRadius: 15,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10, // Small gap between header and messages
  },
  headerIconLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700', // Gold-like background for placeholder
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIconText: {
    fontSize: 20,
    color: '#333',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Inter, sans-serif',
  },
  headerIconRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0', // Light gray background
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {
    fontSize: 22,
    color: '#555',
  },
  chatArea: {
    flex: 1, // Takes up all remaining space between header and input
  },
  chatContentContainer: {
    paddingVertical: 10, // Add some top/bottom padding within the scrollable content
    paddingBottom: 20, // Give some padding at the very bottom of the scroll view
  },
  messageBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botAvatarBackground: {
    backgroundColor: '#FFD700',
  },
  userAvatarBackground: {
    backgroundColor: '#87CEEB',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Inter, sans-serif',
  },
  boldText: {
    fontWeight: 'bold',
  },
  errorMessageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#D32F2F',
    fontFamily: 'Inter, sans-serif',
  },
  imageThumbnail: {
    width: 150,
    height: 100,
    borderRadius: 10,
    resizeMode: 'cover',
    marginVertical: 5,
  },
  userBubbleSpecific: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 5,
  },
  botBubbleSpecific: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 5,
  },
  inputTray: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    height: 70, // Fixed height for input tray
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    marginTop: 10, // Small gap between messages and input
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  plusButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  textInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#F0F0F0',
    borderRadius: 22.5,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Inter, sans-serif',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 22,
    fontWeight: 'bold',
  },
});

export default App;
