import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import AWS from 'aws-sdk';
import NodeCache from 'node-cache';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
// Database client available when needed

// Cache for TTS cost estimates (1 hour TTL)
const costCache = new NodeCache({ stdTTL: 3600 });

export interface TTSRequest {
  text: string;
  voice: string;
  language: string;
  speed?: number;
  provider?: 'google' | 'azure' | 'amazon';
}

export interface TTSResult {
  audioBuffer: Buffer;
  duration: number;
  cost: number;
  provider: string;
  voice: string;
  filePath: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  provider: 'google' | 'azure' | 'amazon';
  costPerChar: number;
}

export class TTSService {
  private googleClient: TextToSpeechClient | null = null;
  private azureConfig: sdk.SpeechConfig | null = null;
  private awsPolly: AWS.Polly | null = null;

  constructor() {
    this.initializeProviders();
  }

  private async initializeProviders() {
    try {
      // Initialize Google Cloud TTS
      if (config.googleCloudApiKey) {
        this.googleClient = new TextToSpeechClient(
          process.env.GOOGLE_APPLICATION_CREDENTIALS
            ? { keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS }
            : {}
        );
        logger.info('🔊 Google TTS initialized');
      }

      // Initialize Azure Speech
      if (config.azureSpeechKey && config.azureSpeechRegion) {
        this.azureConfig = sdk.SpeechConfig.fromSubscription(
          config.azureSpeechKey,
          config.azureSpeechRegion
        );
        logger.info('🔊 Azure Speech initialized');
      }

      // Initialize AWS Polly
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        this.awsPolly = new AWS.Polly({
          region: process.env.AWS_REGION || 'us-east-1',
        });
        logger.info('🔊 AWS Polly initialized');
      }
    } catch (error) {
      logger.error('Failed to initialize TTS providers:', error);
    }
  }

  async generateSpeech(request: TTSRequest): Promise<TTSResult> {
    const provider = request.provider || this.getBestProvider(request.text);
    
    logger.info(`Generating TTS with ${provider} for ${request.text.length} characters`);

    switch (provider) {
      case 'google':
        return this.generateGoogleSpeech(request);
      case 'azure':
        return this.generateAzureSpeech(request);
      case 'amazon':
        return this.generateAmazonSpeech(request);
      default:
        throw new Error(`Unsupported TTS provider: ${provider}`);
    }
  }

  private async generateGoogleSpeech(request: TTSRequest): Promise<TTSResult> {
    if (!this.googleClient) {
      throw new Error('Google TTS not initialized');
    }

    try {
      const [response] = await this.googleClient.synthesizeSpeech({
        input: { text: request.text },
        voice: {
          languageCode: request.language,
          name: request.voice,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: request.speed || 1.0,
          sampleRateHertz: 22050,
        },
      });

      const audioBuffer = Buffer.from(response.audioContent as string, 'binary');
      const filePath = await this.saveAudioFile(audioBuffer, 'google', request.voice);
      const duration = await this.getAudioDuration(filePath);
      const cost = this.calculateGoogleCost(request.text.length);

      return {
        audioBuffer,
        duration,
        cost,
        provider: 'google',
        voice: request.voice,
        filePath,
      };
    } catch (error) {
      logger.error('Google TTS generation failed:', error);
      throw error;
    }
  }

  private async generateAzureSpeech(request: TTSRequest): Promise<TTSResult> {
    if (!this.azureConfig) {
      throw new Error('Azure Speech not initialized');
    }

    try {
      this.azureConfig.speechSynthesisVoiceName = request.voice;
      this.azureConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

      const synthesizer = new sdk.SpeechSynthesizer(this.azureConfig);

      return new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
          request.text,
          async (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const audioBuffer = Buffer.from(result.audioData);
              const filePath = await this.saveAudioFile(audioBuffer, 'azure', request.voice);
              const duration = await this.getAudioDuration(filePath);
              const cost = this.calculateAzureCost(request.text.length);

              resolve({
                audioBuffer,
                duration,
                cost,
                provider: 'azure',
                voice: request.voice,
                filePath,
              });
            } else {
              reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
            }
            synthesizer.close();
          },
          (error) => {
            logger.error('Azure TTS generation failed:', error);
            synthesizer.close();
            reject(error);
          }
        );
      });
    } catch (error) {
      logger.error('Azure TTS generation failed:', error);
      throw error;
    }
  }

  private async generateAmazonSpeech(request: TTSRequest): Promise<TTSResult> {
    if (!this.awsPolly) {
      throw new Error('AWS Polly not initialized');
    }

    try {
      const params = {
        Text: request.text,
        OutputFormat: 'mp3',
        VoiceId: request.voice,
        SampleRate: '22050',
        TextType: 'text',
      };

      const result = await this.awsPolly.synthesizeSpeech(params).promise();
      
      if (!result.AudioStream) {
        throw new Error('No audio stream returned from AWS Polly');
      }

      const audioBuffer = Buffer.from(result.AudioStream as Uint8Array);
      const filePath = await this.saveAudioFile(audioBuffer, 'amazon', request.voice);
      const duration = await this.getAudioDuration(filePath);
      const cost = this.calculateAmazonCost(request.text.length);

      return {
        audioBuffer,
        duration,
        cost,
        provider: 'amazon',
        voice: request.voice,
        filePath,
      };
    } catch (error) {
      logger.error('Amazon Polly TTS generation failed:', error);
      throw error;
    }
  }

  private async saveAudioFile(audioBuffer: Buffer, provider: string, voice: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `${provider}_${voice}_${timestamp}.mp3`;
    const filePath = path.join(config.audioPath, filename);

    // Ensure audio directory exists
    await fs.mkdir(config.audioPath, { recursive: true });
    
    await fs.writeFile(filePath, audioBuffer);
    logger.debug(`Audio file saved: ${filePath}`);
    
    return filePath;
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    // For now, estimate duration based on file size
    // In production, use ffprobe for accurate duration
    try {
      const stats = await fs.stat(filePath);
      // Rough estimate: 1KB ≈ 0.125 seconds for MP3
      return Math.round((stats.size / 1024) * 0.125 * 100) / 100;
    } catch (error) {
      logger.warn('Could not get audio duration, using default:', error);
      return 0;
    }
  }

  private getBestProvider(text: string): 'google' | 'azure' | 'amazon' {
    const length = text.length;
    
    // Google: Best quality, moderate cost
    // Azure: Good quality, lower cost for long texts
    // Amazon: Fast, good for short texts
    
    if (length < 1000) {
      return 'amazon'; // Fast for short texts
    } else if (length < 5000) {
      return 'google'; // Best quality for medium texts
    } else {
      return 'azure'; // Most cost-effective for long texts
    }
  }

  private calculateGoogleCost(characters: number): number {
    // Google pricing: $16 per 1M characters
    return (characters / 1000000) * 16;
  }

  private calculateAzureCost(characters: number): number {
    // Azure pricing: $4 per 1M characters
    return (characters / 1000000) * 4;
  }

  private calculateAmazonCost(characters: number): number {
    // Amazon pricing: $4 per 1M characters
    return (characters / 1000000) * 4;
  }

  async getAvailableVoices(): Promise<VoiceOption[]> {
    const cacheKey = 'available_voices';
    const cached = costCache.get<VoiceOption[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const voices: VoiceOption[] = [
      // Google voices
      { id: 'en-US-Standard-A', name: 'English (US) - Standard A', language: 'en-US', gender: 'female', provider: 'google', costPerChar: 0.000016 },
      { id: 'en-US-Standard-B', name: 'English (US) - Standard B', language: 'en-US', gender: 'male', provider: 'google', costPerChar: 0.000016 },
      { id: 'en-US-Standard-C', name: 'English (US) - Standard C', language: 'en-US', gender: 'female', provider: 'google', costPerChar: 0.000016 },
      { id: 'en-US-Standard-D', name: 'English (US) - Standard D', language: 'en-US', gender: 'male', provider: 'google', costPerChar: 0.000016 },
      
      // Azure voices
      { id: 'en-US-JennyNeural', name: 'English (US) - Jenny Neural', language: 'en-US', gender: 'female', provider: 'azure', costPerChar: 0.000004 },
      { id: 'en-US-GuyNeural', name: 'English (US) - Guy Neural', language: 'en-US', gender: 'male', provider: 'azure', costPerChar: 0.000004 },
      { id: 'en-US-AriaNeural', name: 'English (US) - Aria Neural', language: 'en-US', gender: 'female', provider: 'azure', costPerChar: 0.000004 },
      
      // Amazon voices
      { id: 'Joanna', name: 'English (US) - Joanna', language: 'en-US', gender: 'female', provider: 'amazon', costPerChar: 0.000004 },
      { id: 'Matthew', name: 'English (US) - Matthew', language: 'en-US', gender: 'male', provider: 'amazon', costPerChar: 0.000004 },
      { id: 'Ivy', name: 'English (US) - Ivy', language: 'en-US', gender: 'female', provider: 'amazon', costPerChar: 0.000004 },
    ];

    costCache.set(cacheKey, voices);
    return voices;
  }

  async estimateCost(text: string, voice: string): Promise<{ cost: number; provider: string }> {
    const voices = await this.getAvailableVoices();
    const voiceOption = voices.find(v => v.id === voice);
    
    if (!voiceOption) {
      throw new Error(`Voice not found: ${voice}`);
    }

    const cost = text.length * voiceOption.costPerChar;
    
    return {
      cost: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
      provider: voiceOption.provider,
    };
  }
}

export const ttsService = new TTSService();