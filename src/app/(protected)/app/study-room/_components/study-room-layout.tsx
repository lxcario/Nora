"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MonitorPlay } from "lucide-react";
import { YouTubePlayer, type PlayerController } from "./youtube-player";
import { VideoSearch } from "./video-search";
import { UrlInput } from "./url-input";
import { TimeRangeSelector } from "./time-range-selector";
import { NoteEditor } from "./note-editor";
import { GeneratedNotes } from "./generated-notes";
import { FeynmanVideoPrompt } from "./feynman-video-prompt";
import { TopicLinker, type TopicOption } from "./topic-linker";
import { XpToast } from "@/app/(protected)/app/_components/xp-toast";
import { useSessionStats } from "@/app/(protected)/app/_components/session-stats-context";
import {
  loadVideo,
  fetchTranscript,
  generateNotes,
  saveVideoCards,
  evaluateWithTranscript,
  recordVideoSession,
} from "@/app/(protected)/app/_actions/study-room";

// ─── Types ───────────────────────────────────────────────────────────────────

interface VideoRecord {
  id: string;
  youtubeId: string;
  title: string;
  channelTitle: string | null;
  durationSeconds: number;
  topicId: string | null;
}

interface GeneratedNotesData {
  summary: string;
  keyConcepts: {
    concept: string;
    definition: string;
    timestampCitation: string;
    offsetSeconds: number;
  }[];
  flashcards: {
    front: string;
    back: string;
    offsetSeconds: number;
  }[];
}

interface StudyRoomLayoutProps {
  topics: TopicOption[];
  initialVideoId?: string;
  initialSeekTime?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StudyRoomLayout({
  topics,
  initialVideoId,
  initialSeekTime,
}: StudyRoomLayoutProps) {
  const { addReward } = useSessionStats();

  // Video state
  const [videoId, setVideoId] = useState<string | null>(initialVideoId ?? null);
  const [videoRecord, setVideoRecord] = useState<VideoRecord | null>(null);
  const [playerController, setPlayerController] = useState<PlayerController | null>(null);

  // Transcript
  const [, setTranscriptReady] = useState(false);

  // Player time tracking
  const [currentTime, setCurrentTime] = useState(0);
  const [cumulativePlaySeconds, setCumulativePlaySeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const sessionRecordedRef = useRef(false);
  const cumulativeRef = useRef(0);

  // Note generation
  const [generatedNotes, setGeneratedNotes] = useState<GeneratedNotesData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Video load error
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Search panel
  const [searchExpanded, setSearchExpanded] = useState(!initialVideoId);

  // Feynman segment tracking
  const [feynmanSegmentStart, setFeynmanSegmentStart] = useState(0);

  // XP toast
  const [xpToastData, setXpToastData] = useState({ xp: 0, coins: 0, visible: false });

  // ─── Cumulative play time tracking ──────────────────────────────────────

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isPlaying) {
      interval = setInterval(() => {
        cumulativeRef.current += 1;
        setCumulativePlaySeconds(cumulativeRef.current);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Record video session at 5 minutes (300 seconds)
  useEffect(() => {
    if (
      cumulativePlaySeconds >= 300 &&
      !sessionRecordedRef.current &&
      videoRecord
    ) {
      sessionRecordedRef.current = true;
      recordVideoSession(videoRecord.id, 5).then(() => {
        showXpToast(10, 3);
      });
    }
  }, [cumulativePlaySeconds, videoRecord]);

  // ─── XP Toast Helper ────────────────────────────────────────────────────

  // TODO(option-2-refactor): XP/coins values passed here are hardcoded at call
  // sites to match server rewardAction rules. Drift risk if rules change.
  const showXpToast = useCallback((xp: number, coins: number) => {
    setXpToastData({ xp, coins, visible: true });
    setTimeout(() => setXpToastData((prev) => ({ ...prev, visible: false })), 100);
    addReward(xp, coins);
  }, [addReward]);

  // ─── Video Loading ──────────────────────────────────────────────────────

  const handleLoadVideo = useCallback(
    async (youtubeId: string, title?: string, channel?: string, duration?: number) => {
      setVideoId(youtubeId);
      setGeneratedNotes(null);
      setTranscriptReady(false);
      setCumulativePlaySeconds(0);
      cumulativeRef.current = 0;
      sessionRecordedRef.current = false;
      setFeynmanSegmentStart(0);
      setSearchExpanded(false);
      setVideoLoadError(null);

      // Load video record via server action
      const result = await loadVideo(youtubeId, title ?? "Untitled Video", channel, duration);
      if (result.error) {
        setVideoLoadError(result.error);
        setVideoId(null); // revert to search state so user can try again
        return;
      }
      if (result.data) {
        setVideoRecord({
          id: result.data.id,
          youtubeId: result.data.youtubeId,
          title: result.data.title,
          channelTitle: result.data.channelTitle,
          durationSeconds: result.data.durationSeconds,
          topicId: result.data.topicId,
        });
      }

      // Fetch transcript in background
      if (result.data) {
        fetchTranscript(result.data.id).then((res) => {
          if (res.data) setTranscriptReady(true);
        });
      }
    },
    []
  );

  // Handle initial video load
  useEffect(() => {
    if (initialVideoId && !videoRecord) {
      handleLoadVideo(initialVideoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVideoId]);

  // Handle initial seek time after player is ready
  useEffect(() => {
    if (playerController && initialSeekTime && initialSeekTime > 0) {
      playerController.seekTo(initialSeekTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerController]);

  // ─── Player Callbacks ───────────────────────────────────────────────────

  const handlePlayerReady = useCallback((controller: PlayerController) => {
    setPlayerController(controller);
  }, []);

  const handleTimeUpdate = useCallback((seconds: number) => {
    setCurrentTime(seconds);
  }, []);

  const handleStateChange = useCallback((state: "playing" | "paused" | "ended") => {
    setIsPlaying(state === "playing");
  }, []);

  const handleSeekTo = useCallback(
    (seconds: number) => {
      playerController?.seekTo(seconds);
    },
    [playerController]
  );

  const getCurrentTime = useCallback(() => {
    return playerController?.getCurrentTime() ?? 0;
  }, [playerController]);

  // ─── Note Generation ────────────────────────────────────────────────────

  const handleGenerateNotes = useCallback(
    async (startSeconds: number, endSeconds: number) => {
      if (!videoRecord) return;
      setIsGenerating(true);
      setGeneratedNotes(null);
      setNoteError(null);

      const result = await generateNotes(videoRecord.id, startSeconds, endSeconds);

      if (result.data) {
        setGeneratedNotes(result.data);
        showXpToast(10, 3);
      } else if (result.error) {
        setNoteError(result.error);
      }
      setIsGenerating(false);
    },
    [videoRecord, showXpToast]
  );

  // ─── Card Saving ───────────────────────────────────────────────────────

  const handleSaveCards = useCallback(
    async (cards: { front: string; back: string; offsetSeconds: number }[]) => {
      if (!videoRecord) return { error: "No video loaded" };

      const result = await saveVideoCards(
        cards,
        videoRecord.id,
        videoRecord.topicId ?? undefined
      );

      if (result.success) {
        showXpToast(2 * cards.length, cards.length);
      }

      return result;
    },
    [videoRecord, showXpToast]
  );

  // ─── Feynman Evaluation ─────────────────────────────────────────────────

  const handleFeynmanEvaluate = useCallback(
    async (explanation: string, startSeconds: number, endSeconds: number) => {
      if (!videoRecord) return { error: "No video loaded" };

      const result = await evaluateWithTranscript(
        videoRecord.id,
        explanation,
        startSeconds,
        endSeconds,
        videoRecord.topicId ?? undefined
      );

      if (result.data) {
        showXpToast(15, 5);
      }

      return result;
    },
    [videoRecord, showXpToast]
  );

  const handleFeynmanCompleted = useCallback(() => {
    setFeynmanSegmentStart(currentTime);
  }, [currentTime]);

  // ─── Topic Change ───────────────────────────────────────────────────────

  const handleTopicChange = useCallback((topicId: string | null) => {
    setVideoRecord((prev) =>
      prev ? { ...prev, topicId } : prev
    );
  }, []);

  // ─── Search Callbacks ───────────────────────────────────────────────────

  const handleSearchSelect = useCallback(
    (youtubeId: string, title: string, channel: string, durationSeconds: number) => {
      handleLoadVideo(youtubeId, title, channel, durationSeconds);
    },
    [handleLoadVideo]
  );

  const handleUrlInput = useCallback(
    (youtubeId: string) => {
      handleLoadVideo(youtubeId);
    },
    [handleLoadVideo]
  );

  // ─── Empty State ────────────────────────────────────────────────────────

  if (!videoId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <XpToast xp={xpToastData.xp} coins={xpToastData.coins} visible={xpToastData.visible} />
        <div className="text-center">
          <MonitorPlay className="mx-auto h-12 w-12 text-[var(--pixel-text-muted)]" />
          <h2 className="mt-4 text-lg font-semibold font-pixel text-[var(--pixel-text-primary)]">
            Start Studying
          </h2>
          <p className="mt-1 text-sm text-[var(--pixel-text-secondary)]">
            Search for an educational video or paste a YouTube URL to begin.
          </p>
        </div>
        {videoLoadError && (
          <div
            className="rounded-lg border-2 p-3 text-sm"
            style={{
              borderColor: "var(--pixel-error)",
              backgroundColor: "var(--pixel-bg-secondary)",
              color: "var(--pixel-error)",
            }}
          >
            {videoLoadError}
          </div>
        )}
        <div className="pixel-panel" style={{ padding: "24px" }}>
          <VideoSearch onSelectVideo={handleSearchSelect} />
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--pixel-border)]" />
            <span className="text-xs text-[var(--pixel-text-muted)]">or</span>
            <div className="h-px flex-1 bg-[var(--pixel-border)]" />
          </div>
          <UrlInput onVideoId={handleUrlInput} />
        </div>
      </div>
    );
  }

  // ─── Main Layout (video loaded) ────────────────────────────────────────

  return (
    <div className="space-y-4">
      <XpToast xp={xpToastData.xp} coins={xpToastData.coins} visible={xpToastData.visible} />

      {/* Collapsible Search Panel */}
      <div className="pixel-panel" style={{ padding: 0 }}>
        <button
          onClick={() => setSearchExpanded(!searchExpanded)}
          className="flex w-full items-center justify-between px-4 py-2.5"
        >
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--pixel-text-secondary)" }}>
            <img src="/sprites/travel-book/icons/MagnifyingGlass.png" alt="" width={14} height={14} className="pixel-art" />
            Search or load another video
          </div>
          <span className="font-pixel text-[10px]" style={{ color: "var(--pixel-text-secondary)" }}>
            {searchExpanded ? "▲" : "▼"}
          </span>
        </button>
        {searchExpanded && (
          <div className="space-y-3 px-4 pb-4 pt-3" style={{ borderTop: "2px solid var(--pixel-border)" }}>
            <VideoSearch onSelectVideo={handleSearchSelect} />
            <UrlInput onVideoId={handleUrlInput} />
          </div>
        )}
      </div>

      {/* Split Layout: Player (left) / Editor (right) */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left Panel — Player + Controls (60% on desktop) */}
        <div className="w-full min-w-0 space-y-3 lg:w-[60%]">
          {/* YouTube Player */}
          <YouTubePlayer
            videoId={videoId}
            onReady={handlePlayerReady}
            onTimeUpdate={handleTimeUpdate}
            onStateChange={handleStateChange}
          />

          {/* Time Range Selector (below player) */}
          {videoRecord && (
            <TimeRangeSelector
              videoDuration={videoRecord.durationSeconds}
              onGenerate={handleGenerateNotes}
              isLoading={isGenerating}
              currentTime={currentTime}
            />
          )}

          {/* Topic Linker */}
          {videoRecord && (
            <TopicLinker
              topics={topics}
              videoId={videoRecord.id}
              currentTopicId={videoRecord.topicId}
              onTopicChange={handleTopicChange}
            />
          )}

          {/* Generated Notes */}
          <GeneratedNotes
            data={generatedNotes}
            isLoading={isGenerating}
            onSeekTo={handleSeekTo}
            onSaveCards={handleSaveCards}
          />

          {/* Note Generation Error */}
          {noteError && !isGenerating && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-300">{noteError}</p>
            </div>
          )}

          {/* Feynman Video Prompt */}
          {videoRecord && (
            <FeynmanVideoPrompt
              videoId={videoRecord.id}
              cumulativePlaySeconds={cumulativePlaySeconds}
              currentTime={currentTime}
              segmentStart={feynmanSegmentStart}
              onEvaluate={handleFeynmanEvaluate}
              onSaveCards={handleSaveCards}
              onSeekTo={handleSeekTo}
              onPromptCompleted={handleFeynmanCompleted}
            />
          )}
        </div>

        {/* Right Panel — Note Editor (40% on desktop) */}
        <div className="w-full min-w-0 lg:w-[40%]">
          {videoRecord && (
            <div className="sticky top-4">
              <NoteEditor
                videoId={videoRecord.id}
                videoTitle={videoRecord.title}
                timeSegment={{ start: 0, end: videoRecord.durationSeconds }}
                onSeek={handleSeekTo}
                playerGetCurrentTime={getCurrentTime}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
