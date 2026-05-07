import { Controller, Post, Get, Body, Param, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LPRService, LPRResult } from './lpr.service';

@ApiTags('LPR (License Plate Recognition)')
@Controller('lpr')
export class LPRController {
  constructor(private readonly lprService: LPRService) {}

  @Post('recognize')
  @ApiOperation({ summary: 'Recognize license plate from uploaded image' })
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  async recognizeImage(@UploadedFile() file: Express.Multer.File): Promise<LPRResult> {
    if (!file) {
      return {
        plateNumber: null,
        confidence: 0,
        processingTime: 0,
        framesProcessed: 0,
      };
    }

    // Save temp file
    const tempPath = `/tmp/lpr-${Date.now()}.jpg`;
    require('fs').writeFileSync(tempPath, file.buffer);

    const result = await this.lprService.recognizeFromImage(tempPath);

    // Clean up
    require('fs').unlinkSync(tempPath);

    return result;
  }

  @Post('recognize-url')
  @ApiOperation({ summary: 'Recognize license plate from image URL' })
  async recognizeFromUrl(@Body() body: { url: string }): Promise<LPRResult> {
    // For demo purposes, we'll just return a test result
    // In production, you would download the image and process it
    return {
      plateNumber: null,
      confidence: 0,
      processingTime: 0,
      framesProcessed: 0,
    };
  }

  @Post('process-video')
  @ApiOperation({ summary: 'Process video file and detect license plates' })
  @UseInterceptors(FileInterceptor('video'))
  @ApiConsumes('multipart/form-data')
  async processVideo(
    @UploadedFile() file: Express.Multer.File,
    @Query('frameInterval') frameInterval: number = 30,
  ): Promise<{ frames: LPRResult[]; totalFrames: number }> {
    // Placeholder for video processing
    // In production, use ffmpeg to extract frames and process each
    
    return {
      frames: [],
      totalFrames: 0,
    };
  }

  @Get('validate/:plate')
  @ApiOperation({ summary: 'Validate Russian license plate format' })
  async validatePlate(@Param('plate') plate: string): Promise<{ valid: boolean; normalized: string | null }> {
    const valid = this.lprService.validatePlateNumber(plate);
    return {
      valid,
      normalized: valid ? plate.toUpperCase().replace(/[^АВЕКМНОРСТУХ\d]/g, '') : null,
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test LPR service' })
  async test(): Promise<{ status: string; version: string }> {
    return {
      status: 'ok',
      version: '1.0.0',
    };
  }
}