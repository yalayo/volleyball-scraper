import { createCanvas, Canvas, CanvasRenderingContext2D } from 'canvas';
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

export interface PointEvent {
  point: number;
  team: 'home' | 'away';
  action: 'attack' | 'serve' | 'block' | 'error' | 'timeout';
  player?: string;
  score: {
    home: number;
    away: number;
  };
}

export interface SubstitutionEvent {
  setNumber: number;
  team: 'home' | 'away';
  playerOut: string;
  playerIn: string;
  score: {
    home: number;
    away: number;
  };
}

export class VolleyballVideoGenerator {
  private canvas: Canvas;
  private ctx: CanvasRenderingContext2D;
  private width = 1920;
  private height = 1080;
  private frameRate = 30;

  constructor() {
    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext('2d');
  }

  async generateMatchVideo(data: VideoGenerationData): Promise<string> {
    const outputPath = path.join(process.cwd(), 'temp', `match_${data.match.id}_${Date.now()}.mp4`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(outputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate frames for each set
    const frames: string[] = [];
    
    // Title frame
    const titleFrame = this.generateTitleFrame(data.match);
    frames.push(titleFrame);

    // Generate frames for each set
    for (const set of data.sets) {
      const setFrames = await this.generateSetFrames(data, set);
      frames.push(...setFrames);
    }

    // Summary frame
    const summaryFrame = this.generateSummaryFrame(data);
    frames.push(summaryFrame);

    // Create video from frames
    return this.createVideoFromFrames(frames, outputPath);
  }

  private generateTitleFrame(match: any): string {
    this.clearCanvas();
    
    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(1, '#3b82f6');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 64px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('VOLLEYBALL MATCH ANALYSIS', this.width / 2, 200);

    // Team names
    this.ctx.font = 'bold 48px Arial';
    this.ctx.fillText(match.homeTeamName, this.width / 4, 400);
    this.ctx.fillText('VS', this.width / 2, 400);
    this.ctx.fillText(match.awayTeamName, (this.width * 3) / 4, 400);

    // Score
    this.ctx.font = 'bold 72px Arial';
    this.ctx.fillText(`${match.homeSets} - ${match.awaySets}`, this.width / 2, 550);

    // Match details
    this.ctx.font = '32px Arial';
    if (match.matchDate) {
      const date = new Date(match.matchDate).toLocaleDateString();
      this.ctx.fillText(date, this.width / 2, 700);
    }
    if (match.location) {
      this.ctx.fillText(match.location, this.width / 2, 750);
    }

    return this.saveFrame('title');
  }

  private async generateSetFrames(data: VideoGenerationData, set: MatchSet): Promise<string[]> {
    const frames: string[] = [];
    
    // Set title frame
    this.clearCanvas();
    this.drawSetHeader(set, data.match);
    frames.push(this.saveFrame(`set${set.setNumber}_title`));

    // Parse point sequence
    let pointSequence: PointEvent[] = [];
    if (set.pointSequence) {
      try {
        pointSequence = JSON.parse(set.pointSequence);
      } catch (error) {
        console.error('Failed to parse point sequence:', error);
      }
    }

    // Generate frames for point progression
    if (pointSequence.length > 0) {
      const pointFrames = this.generatePointProgressionFrames(set, pointSequence, data.match);
      frames.push(...pointFrames);
    } else {
      // Generate basic set result frame if no point sequence
      this.clearCanvas();
      this.drawSetHeader(set, data.match);
      this.drawSetResult(set);
      frames.push(this.saveFrame(`set${set.setNumber}_result`));
    }

    // Lineup frame
    const lineupFrame = this.generateLineupFrame(set, data);
    frames.push(lineupFrame);

    return frames;
  }

  private generatePointProgressionFrames(set: MatchSet, pointSequence: PointEvent[], match: any): string[] {
    const frames: string[] = [];
    let currentScore = { home: 0, away: 0 };
    
    // Generate frames for key points (every 5 points or set/match points)
    const keyPoints = pointSequence.filter((point, index) => 
      index % 5 === 0 || 
      point.score.home >= 20 || 
      point.score.away >= 20 ||
      index === pointSequence.length - 1
    );

    for (const point of keyPoints) {
      this.clearCanvas();
      this.drawSetHeader(set, match);
      this.drawPointProgression(point, set);
      this.drawScoreboard(point.score, set);
      frames.push(this.saveFrame(`set${set.setNumber}_point${point.point}`));
    }

    return frames;
  }

  private generateLineupFrame(set: MatchSet, data: VideoGenerationData): string {
    this.clearCanvas();
    
    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#065f46');
    gradient.addColorStop(1, '#10b981');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Set ${set.setNumber} - Starting Lineups`, this.width / 2, 100);

    // Get lineups for this set
    const setLineups = data.lineups.filter(lineup => lineup.setNumber === set.setNumber);
    
    if (setLineups.length >= 2) {
      // Home team lineup (left side)
      this.drawTeamLineup(setLineups[0], data.match.homeTeamName, this.width / 4, 200);
      
      // Away team lineup (right side)
      this.drawTeamLineup(setLineups[1], data.match.awayTeamName, (this.width * 3) / 4, 200);
    }

    return this.saveFrame(`set${set.setNumber}_lineup`);
  }

  private generateSummaryFrame(data: VideoGenerationData): string {
    this.clearCanvas();
    
    // Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#7c2d12');
    gradient.addColorStop(1, '#ea580c');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 56px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MATCH SUMMARY', this.width / 2, 150);

    // Final score
    this.ctx.font = 'bold 72px Arial';
    this.ctx.fillText(`${data.match.homeTeamName} ${data.match.homeSets}`, this.width / 2, 300);
    this.ctx.fillText(`${data.match.awayTeamName} ${data.match.awaySets}`, this.width / 2, 400);

    // Set results
    if (data.match.setResults) {
      this.ctx.font = '36px Arial';
      this.ctx.fillText(`Sets: ${data.match.setResults}`, this.width / 2, 550);
    }

    // Match statistics
    this.drawMatchStatistics(data);

    return this.saveFrame('summary');
  }

  private drawSetHeader(set: MatchSet, match: any): void {
    // Header background
    this.ctx.fillStyle = '#1f2937';
    this.ctx.fillRect(0, 0, this.width, 120);

    // Set title
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 40px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`SET ${set.setNumber}`, this.width / 2, 50);

    // Team names
    this.ctx.font = '28px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(match.homeTeamName, 50, 90);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(match.awayTeamName, this.width - 50, 90);
  }

  private drawSetResult(set: MatchSet): void {
    // Large score display
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 120px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${set.homeScore} - ${set.awayScore}`, this.width / 2, this.height / 2);

    // Duration if available
    if (set.duration) {
      this.ctx.font = '32px Arial';
      const minutes = Math.floor(set.duration / 60);
      const seconds = set.duration % 60;
      this.ctx.fillText(`Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`, this.width / 2, this.height / 2 + 100);
    }
  }

  private drawPointProgression(point: PointEvent, set: MatchSet): void {
    // Point action
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '36px Arial';
    this.ctx.textAlign = 'center';
    
    const actionText = `${point.action.toUpperCase()}${point.player ? ` by ${point.player}` : ''}`;
    this.ctx.fillText(actionText, this.width / 2, this.height / 2 - 50);

    // Team indicator
    const teamColor = point.team === 'home' ? '#3b82f6' : '#ef4444';
    this.ctx.fillStyle = teamColor;
    this.ctx.fillRect(this.width / 2 - 100, this.height / 2 - 20, 200, 40);
  }

  private drawScoreboard(score: { home: number; away: number }, set: MatchSet): void {
    // Scoreboard background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(this.width / 2 - 200, this.height - 200, 400, 100);

    // Scores
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${score.home} - ${score.away}`, this.width / 2, this.height - 130);
  }

  private drawTeamLineup(lineup: MatchLineup, teamName: string, centerX: number, startY: number): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(teamName, centerX, startY);

    // Draw court positions
    const positions = [
      { pos: 1, player: lineup.position1, x: centerX + 60, y: startY + 100 },
      { pos: 2, player: lineup.position2, x: centerX, y: startY + 100 },
      { pos: 3, player: lineup.position3, x: centerX - 60, y: startY + 100 },
      { pos: 4, player: lineup.position4, x: centerX - 60, y: startY + 200 },
      { pos: 5, player: lineup.position5, x: centerX, y: startY + 200 },
      { pos: 6, player: lineup.position6, x: centerX + 60, y: startY + 200 }
    ];

    this.ctx.font = '20px Arial';
    positions.forEach(pos => {
      if (pos.player) {
        // Position circle
        this.ctx.fillStyle = '#3b82f6';
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 30, 0, 2 * Math.PI);
        this.ctx.fill();

        // Position number
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(pos.pos.toString(), pos.x, pos.y + 5);

        // Player name (abbreviated)
        const playerName = pos.player.split(' ').pop() || pos.player;
        this.ctx.fillText(playerName.substring(0, 10), pos.x, pos.y + 50);
      }
    });

    // Libero
    if (lineup.libero) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Libero: ${lineup.libero}`, centerX, startY + 300);
    }
  }

  private drawMatchStatistics(data: VideoGenerationData): void {
    const totalSets = data.sets.length;
    let totalDuration = 0;
    
    data.sets.forEach(set => {
      if (set.duration) totalDuration += set.duration;
    });

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '28px Arial';
    this.ctx.textAlign = 'center';
    
    if (totalDuration > 0) {
      const hours = Math.floor(totalDuration / 3600);
      const minutes = Math.floor((totalDuration % 3600) / 60);
      this.ctx.fillText(`Total Duration: ${hours}h ${minutes}m`, this.width / 2, 650);
    }
    
    this.ctx.fillText(`Total Sets: ${totalSets}`, this.width / 2, 700);
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private saveFrame(name: string): string {
    const framePath = path.join(process.cwd(), 'temp', `frame_${name}_${Date.now()}.png`);
    const buffer = this.canvas.toBuffer('image/png');
    fs.writeFileSync(framePath, buffer);
    return framePath;
  }

  private async createVideoFromFrames(frames: string[], outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add each frame with duration
      frames.forEach((frame, index) => {
        command.addInput(frame);
      });

      command
        .inputOptions(['-framerate 1/3']) // 3 seconds per frame
        .outputOptions([
          '-c:v libx264',
          '-pix_fmt yuv420p',
          '-r 30'
        ])
        .output(outputPath)
        .on('end', () => {
          // Clean up frame files
          frames.forEach(frame => {
            if (fs.existsSync(frame)) {
              fs.unlinkSync(frame);
            }
          });
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Video generation error:', err);
          reject(err);
        })
        .run();
    });
  }
}

export const videoGenerator = new VolleyballVideoGenerator();