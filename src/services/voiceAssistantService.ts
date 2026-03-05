/**
 * Voice Assistant Service - Slyntos Voice Control
 * Handles speech recognition, command parsing, and text-to-speech
 */

export interface VoiceCommand {
  intent: string;
  confidence: number;
  raw: string;
  parameters?: Record<string, any>;
}

export interface CommandAction {
  execute: (matches: RegExpMatchArray) => Promise<void> | void;
  description: string;
  feedback?: string;
}

export class VoiceAssistantService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesisUtterance | null = null;
  private isListening = false;
  private wakeWordDetected = false;
  private commandListeners: Map<string, { execute: () => void, description: string }> = new Map();
  private onStateChangeCallback?: (state: VoiceState) => void;
  private wakeWord = "slyntos"; // Wake word to activate the assistant
  private commands: Map<RegExp, CommandAction> = new Map();
  private continuousListening = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private lastProcessedTranscript = "";

  constructor() {
    this.initSpeechRecognition();
    this.initTextToSpeech();
    this.registerDefaultCommands();
  }

  /**
   * Initialize speech recognition
   */
  private initSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      this.updateState({ status: 'error', message: 'Speech recognition not supported' });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        console.log('Voice recognition started');
        this.isListening = true;
        this.updateState({ status: 'listening', message: 'Listening for wake word...' });
      };

      this.recognition.onend = () => {
        console.log('Voice recognition ended');
        this.isListening = false;
        this.wakeWordDetected = false;
        
        // Restart if we should be listening
        if (this.continuousListening) {
          setTimeout(() => this.startListening(), 100);
        } else {
          this.updateState({ status: 'idle', message: 'Voice recognition stopped' });
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.updateState({ status: 'error', message: `Error: ${event.error}` });
        
        if (event.error === 'not-allowed') {
          this.continuousListening = false;
        }
      };

      this.recognition.onresult = (event) => {
        this.processSpeechResult(event);
      };
    }
  }

  /**
   * Initialize text-to-speech
   */
  private initTextToSpeech() {
    this.synthesis = new SpeechSynthesisUtterance();
    this.synthesis.rate = 1.0;
    this.synthesis.pitch = 1.0;
    this.synthesis.volume = 1.0;
    this.synthesis.lang = 'en-US';
    
    // Get available voices
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Female'));
      if (preferredVoice) {
        this.synthesis!.voice = preferredVoice;
      }
    };
  }

  /**
   * Register default voice commands
   */
  private registerDefaultCommands() {
    // Wake word detection
    this.commandListeners.set('wake', {
      execute: () => {
        this.wakeWordDetected = true;
        this.speak('Yes, how can I help you?');
        this.updateState({ status: 'active', message: 'Wake word detected. Listening for commands...' });
        
        // Auto-stop after 5 seconds of inactivity
        setTimeout(() => {
          if (this.wakeWordDetected) {
            this.wakeWordDetected = false;
            this.speak('Listening timed out. Say "Slyntos" to wake me again.');
            this.updateState({ status: 'idle', message: 'Timed out. Say wake word to reactivate.' });
          }
        }, 5000);
      },
      description: 'Wake word detection',
    });

    // Camera commands
    this.registerCommand(/open camera|start camera|launch camera/i, {
      execute: () => this.executeCommand('openCamera'),
      description: 'Open the camera',
      feedback: 'Opening camera now'
    });

    this.registerCommand(/take photo|take picture|capture|snap/i, {
      execute: () => this.executeCommand('takePhoto'),
      description: 'Take a photo',
      feedback: 'Photo captured'
    });

    this.registerCommand(/start recording|record video/i, {
      execute: () => this.executeCommand('startRecording'),
      description: 'Start video recording',
      feedback: 'Recording started'
    });

    this.registerCommand(/stop recording|end recording/i, {
      execute: () => this.executeCommand('stopRecording'),
      description: 'Stop video recording',
      feedback: 'Recording stopped'
    });

    this.registerCommand(/zoom in|closer/i, {
      execute: () => this.executeCommand('zoomIn'),
      description: 'Zoom in',
      feedback: 'Zooming in'
    });

    this.registerCommand(/zoom out|wider/i, {
      execute: () => this.executeCommand('zoomOut'),
      description: 'Zoom out',
      feedback: 'Zooming out'
    });

    this.registerCommand(/switch camera|front camera|back camera/i, {
      execute: () => this.executeCommand('switchCamera'),
      description: 'Switch between front and back camera',
      feedback: 'Switching camera'
    });

    this.registerCommand(/apply filter|change filter/i, {
      execute: () => this.executeCommand('applyFilter'),
      description: 'Change camera filter',
      feedback: 'Applying filter'
    });

    this.registerCommand(/stop camera|close camera|turn off camera/i, {
      execute: () => this.executeCommand('closeCamera'),
      description: 'Close the camera',
      feedback: 'Camera closed'
    });

    // App commands
    this.registerCommand(/open (youtube|google|gmail|maps)/i, {
      execute: (matches) => {
        const app = matches[1].toLowerCase();
        this.executeCommand('openApp', { app });
      },
      description: 'Open an application',
      feedback: 'Opening application'
    });

    this.registerCommand(/search for (.+)/i, {
      execute: (matches) => {
        const query = matches[1];
        this.executeCommand('search', { query });
      },
      description: 'Search the web',
      feedback: 'Searching...'
    });

    this.registerCommand(/what time is it|current time/i, {
      execute: () => this.executeCommand('getTime'),
      description: 'Get current time',
    });

    this.registerCommand(/what('s| is) the date|today('s)? date/i, {
      execute: () => this.executeCommand('getDate'),
      description: 'Get current date',
    });

    this.registerCommand(/help|what can you do/i, {
      execute: () => this.showHelp(),
      description: 'Show available commands',
    });

    this.registerCommand(/stop listening|go to sleep/i, {
      execute: () => {
        this.wakeWordDetected = false;
        this.continuousListening = false;
        this.stopListening();
        this.speak('Goodbye');
      },
      description: 'Stop the voice assistant',
    });
  }

  /**
   * Register a custom command
   */
  registerCommand(pattern: RegExp, action: CommandAction) {
    this.commands.set(pattern, action);
  }

  /**
   * Execute a registered command
   */
  private async executeCommand(command: string, params?: any) {
    console.log(`Executing command: ${command}`, params);
    
    // Emit event for the app to handle
    const event = new CustomEvent('slyntos-voice-command', {
      detail: { command, params }
    });
    window.dispatchEvent(event);
    
    // Provide feedback
    const action = Array.from(this.commands.values())
      .find(a => a.feedback && a.feedback.toLowerCase().includes(command.toLowerCase()));
    
    if (action?.feedback) {
      this.speak(action.feedback);
    }
  }

  /**
   * Process speech recognition results
   */
  private processSpeechResult(event: SpeechRecognitionEvent) {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    transcript = transcript.trim().toLowerCase();
    
    const lastResult = event.results[event.results.length - 1];
    const isFinal = lastResult.isFinal;

    if (transcript === this.lastProcessedTranscript && !isFinal) return;
    this.lastProcessedTranscript = transcript;

    console.log(`Live Transcript: "${transcript}" (final: ${isFinal})`);

    // Handle Wake Word + Command in one go
    if (transcript.includes(this.wakeWord)) {
      // If wake word detected, extract the command part
      const wakeWordIndex = transcript.indexOf(this.wakeWord);
      const commandPart = transcript.substring(wakeWordIndex + this.wakeWord.length).trim();

      if (!this.wakeWordDetected) {
        this.wakeWordDetected = true;
        this.updateState({ status: 'active', message: 'Slyntos active' });
        
        // If there's already a command following the wake word, process it
        if (commandPart.length > 0) {
          this.matchAndExecuteCommand(commandPart, isFinal);
        } else {
          this.speak("How can I help?");
        }
      } else if (commandPart.length > 0) {
        this.matchAndExecuteCommand(commandPart, isFinal);
      }
    } else if (this.wakeWordDetected) {
      // Already activated, just process the transcript
      this.matchAndExecuteCommand(transcript, isFinal);
    }
  }

  /**
   * Match transcript against registered commands and execute if found
   */
  private matchAndExecuteCommand(transcript: string, isFinal: boolean) {
    let commandExecuted = false;
    
    for (const [pattern, action] of this.commands.entries()) {
      const matches = transcript.match(pattern);
      if (matches) {
        // Only execute on final result to avoid multiple triggers, 
        // unless it's a real-time command like zoom
        const isRealtimeCommand = pattern.source.includes('zoom');
        
        if (isFinal || isRealtimeCommand) {
          console.log(`Matched command: ${pattern}`);
          action.execute(matches);
          commandExecuted = true;
          
          // Reset wake word after successful command execution if it's final
          if (isFinal) {
            this.wakeWordDetected = false;
            this.updateState({ status: 'listening', message: 'Listening...' });
          }
        }
        break;
      }
    }

    if (isFinal && !commandExecuted && this.wakeWordDetected) {
      // Only speak error if we were explicitly waiting for a command
      this.speak("Command not recognized.");
      this.wakeWordDetected = false;
      this.updateState({ status: 'listening', message: 'Listening...' });
    }
  }

  /**
   * Start listening for voice commands
   */
  startListening(continuous: boolean = true) {
    if (!this.recognition) {
      console.error('Speech recognition not initialized');
      return;
    }

    if (this.isListening) {
      this.stopListening();
      setTimeout(() => this.startListening(continuous), 100);
      return;
    }

    this.continuousListening = continuous;
    
    try {
      this.recognition.start();
      this.updateState({ status: 'starting', message: 'Starting voice recognition...' });
    } catch (error) {
      console.error('Failed to start recognition:', error);
      this.updateState({ status: 'error', message: 'Failed to start voice recognition' });
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.continuousListening = false;
      this.wakeWordDetected = false;
    }
  }

  /**
   * Speak text
   */
  speak(text: string) {
    if (!this.synthesis) {
      console.error('Text-to-speech not initialized');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    this.synthesis.text = text;
    window.speechSynthesis.speak(this.synthesis);
    
    this.updateState({ 
      status: this.wakeWordDetected ? 'active' : 'idle', 
      message: text,
      lastSpoken: text 
    });
  }

  /**
   * Show help with available commands
   */
  private showHelp() {
    const commands = Array.from(this.commands.entries())
      .map(([pattern, action]) => `• ${pattern.toString().replace(/[\/\\]/g, '')} - ${action.description}`)
      .join('\n');
    
    const helpText = `Available commands:\n${commands}\n\nSay "Slyntos" to wake me up first.`;
    
    // Create a modal or tooltip
    const helpModal = document.createElement('div');
    helpModal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[3000]';
    helpModal.innerHTML = `
      <div class="bg-gray-900 rounded-2xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-700">
        <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <span class="text-2xl">🎤</span> Voice Commands
        </h2>
        <div class="space-y-2 font-mono text-sm">
          ${Array.from(this.commands.entries()).map(([pattern, action]) => `
            <div class="p-2 bg-gray-800 rounded-lg">
              <span class="text-purple-400">${pattern.toString().replace(/[\/\\]/g, '')}</span>
              <span class="text-gray-400 ml-2">- ${action.description}</span>
            </div>
          `).join('')}
        </div>
        <p class="mt-4 text-sm text-gray-500">Say "<span class="text-purple-400 font-bold">Slyntos</span>" to wake me up first!</p>
        <button onclick="this.closest('.fixed').remove()" class="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200">
          Close
        </button>
      </div>
    `;
    document.body.appendChild(helpModal);
    
    this.speak('Here are the available voice commands');
  }

  /**
   * Update voice assistant state
   */
  private updateState(state: VoiceState) {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  /**
   * Set state change callback
   */
  onStateChange(callback: (state: VoiceState) => void) {
    this.onStateChangeCallback = callback;
  }

  /**
   * Initialize audio visualization
   */
  async initVisualization(canvas: HTMLCanvasElement) {
    try {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;
      
      const draw = () => {
        requestAnimationFrame(draw);
        
        if (this.analyser) {
          this.analyser.getByteFrequencyData(dataArray);
          
          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          canvasCtx.fillStyle = '#111827';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            
            const gradient = canvasCtx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
            gradient.addColorStop(0, '#8b5cf6');
            gradient.addColorStop(1, '#ec4899');
            
            canvasCtx.fillStyle = gradient;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
          }
        }
      };
      
      draw();
      
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
      
    } catch (error) {
      console.error('Failed to initialize audio visualization:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopListening();
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    window.speechSynthesis.cancel();
  }
}

export interface VoiceState {
  status: 'idle' | 'listening' | 'active' | 'processing' | 'error' | 'starting';
  message: string;
  lastSpoken?: string;
}
