import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { MatchSet, MatchLineup } from '@shared/schema';

export interface VideoGenerationData {
  match: {
    id: number;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    homeSets: number;
    awaySets: number;
    setResults: string | null;
    matchDate: string | null;
    location: string | null;
  };
  sets: MatchSet[];
  lineups: MatchLineup[];
}

export class VolleyballVideoGenerator {
  private width = 1920;
  private height = 1080;
  private frameRate = 30;

  constructor() {
    // Simple text-based video generator
  }

  async generateMatchVideo(data: VideoGenerationData): Promise<Buffer> {
    // Generate video in memory and return as buffer
    return this.createSimpleTextVideo(data);
  }

  private async createSimpleTextVideo(data: VideoGenerationData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Create a simple colored background video with text overlay
      const matchTitle = `${data.match.homeTeamName} vs ${data.match.awayTeamName}`;
      const scoreText = `${data.match.homeSets} - ${data.match.awaySets}`;
      const dateText = data.match.matchDate ? new Date(data.match.matchDate).toLocaleDateString() : '';
      
      // Generate text content for the video
      const textContent = [
        matchTitle,
        scoreText,
        dateText,
        `Sets: ${data.match.setResults || 'N/A'}`,
        `Total Sets: ${data.sets.length}`,
        `Location: ${data.match.location || 'Not specified'}`
      ].filter(Boolean).join('\\n\\n');

      // Create temporary file
      const tempPath = path.join('/tmp', `video_${Date.now()}.mp4`);

      ffmpeg()
        .input('color=c=blue:s=1920x1080:d=5')
        .inputFormat('lavfi')
        .videoFilters([
          `drawtext=text='${textContent.replace(/'/g, "\\'")}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`
        ])
        .outputOptions([
          '-pix_fmt yuv420p',
          '-c:v libx264',
          '-preset ultrafast',
          '-crf 28'
        ])
        .output(tempPath)
        .on('end', () => {
          console.log('Video generation completed');
          // Read the file and return as buffer
          fs.readFile(tempPath, (err, data) => {
            if (err) {
              reject(err);
              return;
            }
            // Clean up temp file
            fs.unlink(tempPath, () => {});
            resolve(data);
          });
        })
        .on('error', (err: Error) => {
          console.error('Video generation error:', err);
          reject(err);
        })
        .run();
    });
  }
}

export const videoGenerator = new VolleyballVideoGenerator();