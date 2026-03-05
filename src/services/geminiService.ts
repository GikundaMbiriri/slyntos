
import { GoogleGenAI, Modality, FunctionCall, Type, GenerateContentResponse } from "@google/genai";
import type { Message, FileData, Page, Source, GenConfig, User } from '@/types';
import { Page as PageEnum } from '@/types';

// SLYNTOS NEURAL ARCHITECTURE
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';
const TEXT_MODEL_FAST = 'gemini-3-flash-preview';
const TEXT_MODEL_PRO = 'gemini-3.1-pro-preview';
const TEXT_MODEL_LITE = 'gemini-flash-lite-latest';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

export interface GenerationOptions {
    useThinking?: boolean;
    useLite?: boolean;
    aspectRatio?: string;
    videoDuration?: number;
    advancedConfig?: GenConfig;
    currentUser?: User;
}

const buildGeminiContent = (history: Message[]) => {
    // Limit context to last 10 messages for speed
    const recentHistory = history.slice(-10);
    return recentHistory.map(msg => {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });

        if (msg.role === 'user' && msg.files && msg.files.length > 0) {
            msg.files.forEach(file => {
                parts.push({
                    inlineData: {
                        mimeType: file.type,
                        data: file.data
                    }
                });
            });
        }
        if (parts.length === 0) parts.push({ text: '' });
        return { role: msg.role, parts };
    });
};

export async function generateImage(prompt: string, referenceFiles?: FileData[]): Promise<string[]> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const parts: any[] = [{ text: prompt }];
    if (referenceFiles && referenceFiles.length > 0) {
        referenceFiles.forEach(file => {
            if (file.type.startsWith('image/')) {
                parts.push({ inlineData: { mimeType: file.type, data: file.data } });
            }
        });
    }
    const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ parts }],
        config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const images: string[] = [];
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) images.push(part.inlineData.data);
    }
    return images;
}

export async function generateVideo(
    prompt: string, 
    aspectRatio: '16:9' | '9:16' = '16:9',
    onProgress?: (message: string) => void
): Promise<string> {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    try {
        onProgress?.("Starting video generation...");
        let operation = await ai.models.generateVideos({
            model: VIDEO_MODEL,
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio
            }
        });

        onProgress?.("Creating your video (this usually takes 1-2 minutes)...");
        
        let attempts = 0;
        while (!operation.done && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
            attempts++;
        }

        if (!operation.done) {
            console.error("Operation timed out:", JSON.stringify(operation, null, 2));
            throw new Error("Video generation timed out. Please try again.");
        }

        if (operation.error) {
            console.error("Operation error:", JSON.stringify(operation.error, null, 2));
            throw new Error(`Video generation failed: ${operation.error.message || "Unknown error"}`);
        }

        const generatedVideos = operation.response?.generatedVideos;
        if (!generatedVideos || generatedVideos.length === 0) {
            console.error("No videos in response:", JSON.stringify(operation.response, null, 2));
            throw new Error("Video generation completed but no video assets were found in the response.");
        }

        const downloadLink = generatedVideos[0]?.video?.uri;
        if (!downloadLink) {
            console.error("Video URI missing:", JSON.stringify(generatedVideos[0], null, 2));
            throw new Error("Video asset found but download link is missing.");
        }

        onProgress?.("Downloading video asset...");
        const response = await fetch(downloadLink, {
            method: 'GET',
            headers: {
                'x-goog-api-key': apiKey || '',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status}`);
        }
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e: any) {
        console.error("Video generation error:", e);
        throw e;
    }
}

export async function generateSpeech(text: string, voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice }
                }
            }
        }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to generate speech");
    return `data:audio/mp3;base64,${base64Audio}`;
}

export async function* generateContentStream(
    history: Message[],
    systemInstruction: string,
    page: Page,
    options: GenerationOptions = {}
): AsyncGenerator<{ text?: string, sources?: Source[], functionCalls?: FunctionCall[], images?: string[], videoUrl?: string, videoScript?: any }> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const formattedInstruction = (options.advancedConfig?.systemInstructionOverride || systemInstruction);
    const lastUserMsg = history[history.length - 1];
    const userPrompt = lastUserMsg?.content.toLowerCase() || "";

    // Video check
    if (userPrompt.match(/(generate|create|make) (a |an )?video/)) {
        yield { text: "Starting your video generation..." };
        try {
            const videoUrl = await generateVideo(lastUserMsg.content, (options.aspectRatio === '9:16' ? '9:16' : '16:9'));
            yield { text: "Your video is ready!", videoUrl };
            return;
        } catch (err: any) {
            yield { text: `\n\nSorry, there was an error: ${err.message}` };
            return;
        }
    }

    // Image check (Generation & Editing)
    const imageKeywords = ['generate', 'create', 'make', 'draw', 'image', 'photo', 'picture', 'style', 'painting', 'sketch', 'cartoon', 'anime', 'logo', 'render', 'blueprint', 'portrait', 'edit', 'modify', 'change', 'fix', 'update', 'transform'];
    const isImageRequest = imageKeywords.some(kw => userPrompt.includes(kw)) && 
                          (userPrompt.includes('image') || userPrompt.includes('photo') || lastUserMsg.files?.some(f => f.type.startsWith('image/')));

    if (isImageRequest) {
        yield { text: lastUserMsg.files?.some(f => f.type.startsWith('image/')) ? "Analyzing and modifying your image..." : "Creating your image..." };
        try {
            const images = await generateImage(lastUserMsg.content, lastUserMsg.files);
            yield { text: "Here is the result:", images };
            return;
        } catch (err: any) {
            yield { text: `\n\nSorry, there was an error: ${err.message}` };
            return;
        }
    }

    const contents = buildGeminiContent(history);
    try {
        let modelName = TEXT_MODEL_FAST; 
        
        // Determine model based on task requirements
        const hasImages = lastUserMsg?.files?.some(f => f.type.startsWith('image/'));
        const hasAudio = lastUserMsg?.files?.some(f => f.type.startsWith('audio/'));

        if (options.useThinking || hasImages) {
            modelName = TEXT_MODEL_PRO; // Pro for complex tasks and image analysis
        } else if (options.useLite) {
            modelName = TEXT_MODEL_LITE; // Lite for fast responses
        } else if (hasAudio) {
            modelName = TEXT_MODEL_FAST; // Flash for audio transcription
        }

        const config: any = { 
            systemInstruction: formattedInstruction,
            temperature: options.advancedConfig?.temperature ?? (page === PageEnum.Edu ? 0.9 : 0.4),
            topP: options.advancedConfig?.topP ?? 0.9,
            topK: options.advancedConfig?.topK ?? 32,
            tools: [{ googleSearch: {} }] // Enable Slyntos Search for all models that support it
        };

        // Only Gemini 3 models support thinkingLevel
        if (modelName.startsWith('gemini-3')) {
            config.thinkingConfig = { thinkingLevel: options.useThinking ? "HIGH" : "LOW" };
        }

        const responseStream = await ai.models.generateContentStream({ model: modelName, contents, config });
        for await (const chunk of responseStream) {
            const sources: Source[] = [];
            chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
                if (c.web?.uri && c.web?.title) {
                    sources.push({ uri: c.web.uri, title: c.web.title });
                }
            });
            yield { text: chunk.text, sources: sources.length > 0 ? sources : undefined, functionCalls: chunk.functionCalls };
        }
    } catch (error: any) {
        console.error("Slyntos Neural Error:", error);
        yield { text: `\n\n⚠️ **Slyntos Neural Link Interrupted**\nSlyntos has experienced a connection error. Please try again.` };
    }
}
