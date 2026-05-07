import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Tesseract from 'tesseract.js';

export interface LPRResult {
  plateNumber: string | null;
  confidence: number;
  processingTime: number;
  framesProcessed: number;
  image?: string; // base64 cropped plate image
}

@Injectable()
export class LPRService {
  private readonly logger = new Logger(LPRService.name);

  // Russian license plate pattern
  private readonly platePattern = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/i;

  // Alternative pattern for new format plates
  private readonly newPlatePattern = /^[АВЕКМНОРСТУХ]{2}\d{3}\d{2}$/i;

  async recognizeFromImage(imagePath: string): Promise<LPRResult> {
    const startTime = Date.now();
    this.logger.log(`Processing image: ${imagePath}`);

    try {
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Read image and convert to base64 for Tesseract
      const imageBuffer = fs.readFileSync(imagePath);
      const imageBase64 = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      // Perform OCR
      const result = await Tesseract.recognize(
        `data:${mimeType};base64,${imageBase64}`,
        'rus+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
            }
          },
        }
      );

      const text = result.data.text.trim();
      const confidence = result.data.confidence;

      // Parse and clean the license plate
      const plateNumber = this.parsePlateNumber(text);

      const processingTime = Date.now() - startTime;

      this.logger.log(`Recognized: ${plateNumber} (confidence: ${confidence}%, time: ${processingTime}ms)`);

      return {
        plateNumber,
        confidence,
        processingTime,
        framesProcessed: 1,
        image: imageBase64.slice(0, 1000) + '...', // reduced for logging
      };
    } catch (error) {
      this.logger.error(`Failed to process image: ${error.message}`);
      return {
        plateNumber: null,
        confidence: 0,
        processingTime: Date.now() - startTime,
        framesProcessed: 1,
      };
    }
  }

  async recognizeFromVideoFrame(videoPath: string, framePosition: number = 0): Promise<LPRResult> {
    // For video, we'll extract a frame and process it
    // Since we don't have OpenCV, we'll return a placeholder
    // In production, you would use ffmpeg to extract frames
    
    this.logger.warn('Video processing requires OpenCV. Install opencv-python-headless for full support.');
    
    return {
      plateNumber: null,
      confidence: 0,
      processingTime: 0,
      framesProcessed: 0,
    };
  }

  private parsePlateNumber(text: string): string | null {
    // Clean the text
    const cleaned = text
      .toUpperCase()
      .replace(/[^АВЕКМНОРСТУХавекмнорстух\d]/g, '')
      .trim();

    // Try to find a valid plate number pattern
    const patterns = [
      /([АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3})/i,
      /([АВЕКМНОРСТУХ]{2}\d{3}\d{2})/i,
      /(\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3})/i,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        return this.formatPlateNumber(match[1]);
      }
    }

    // If no pattern found, try to find a close match
    const closeMatch = this.findClosestMatch(cleaned);
    return closeMatch;
  }

  private findClosestMatch(text: string): string | null {
    // Look for sequences that look like plate numbers
    const plateLikePattern = /\d{2,4}/g;
    const matches = text.match(plateLikePattern);

    if (matches && matches.length >= 2) {
      // Combine consecutive matches
      return matches.slice(0, 3).join('');
    }

    // Return null if no valid plate found
    return null;
  }

  private formatPlateNumber(plate: string): string {
    // Ensure proper format (e.g., A123BC77)
    return plate.toUpperCase().replace(/[^АВЕКМНОРСТУХ\d]/g, '');
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.bmp': 'image/bmp',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  validatePlateNumber(plate: string): boolean {
    const normalized = plate.toUpperCase().replace(/[^АВЕКМНОРСТУХ\d]/g, '');
    return this.platePattern.test(normalized) || this.newPlatePattern.test(normalized);
  }
}