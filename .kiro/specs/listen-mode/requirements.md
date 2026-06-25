# AI Study Podcast Generator ("Listen Mode") — Requirements

## Overview
Transform the student's Feynman explanations, flashcards, and research notes into conversational AI-generated audio podcast episodes (10-15 minutes) that enable passive review during commutes, workouts, or chores.

## Research Basis
- AI-generated personalized podcasts led to significantly improved learning outcomes compared to textbook reading (arxiv.org/html/2409.04645)
- Students found the audio format more enjoyable than traditional study methods
- Dual coding theory: audio engages different memory circuits than reading/typing

## Requirements

### 1. Script Generation
- 1.1: Given a topic, generate a podcast script from the student's existing content (Feynman explanations, suggested cards, research answers)
- 1.2: Script must follow an explain-pause-question-answer-recap structure for active engagement
- 1.3: Script length must target 10-15 minutes of spoken content (~1500-2000 words)
- 1.4: Script must reference actual source material (never fabricate claims beyond what the student has studied)
- 1.5: Support two "host" personas — one explains, one asks clarifying questions (conversational format)
- 1.6: Include 3-5 embedded recall questions throughout the episode ("Before I explain, can you recall...?")

### 2. Audio Synthesis
- 2.1: Generate audio client-side using Web Speech API (SpeechSynthesis) for zero external API cost
- 2.2: Use two distinct voices for the two host personas
- 2.3: Insert natural pauses (2-3 seconds) before recall questions to give the student time to think
- 2.4: Support playback controls: play, pause, skip forward/back 15s, speed control (0.75x-2x)

### 3. Scheduling & Integration
- 3.1: Podcast episodes can be generated on-demand for any topic
- 3.2: After listening, present a quick 3-question active recall quiz (from the embedded questions)
- 3.3: Quiz results feed back into the FSRS system (correct = Good, incorrect = Again)
- 3.4: Completed episodes earn XP (+10) and pet affinity (+2)
- 3.5: Track "listen streak" as a separate stat in analytics

### 4. Content Sources (Priority Order)
- 4.1: Feynman explanations (student's own words — best for reinforcement)
- 4.2: Research desk answers (cited synthesis — good for deep topics)
- 4.3: Flashcard sets (Q&A format — good for definition-heavy topics)
- 4.4: Video study notes (timestamped concepts — good for lecture recaps)

### 5. UI/UX
- 5.1: Accessible from a "Listen" button on each topic's detail view
- 5.2: Mini audio player in the sidebar/bottom bar (persists across navigation)
- 5.3: Pixel-art podcast icon and player styling consistent with the app theme
- 5.4: Loading state with estimated generation time (~5-10 seconds)

### 6. Constraints
- 6.1: No external TTS API dependency (Web Speech API only for v1)
- 6.2: Scripts stored as text in the database (not audio files) — synthesized on playback
- 6.3: Rate limited to 5 podcast generations per hour (reuses LLM pipeline)
- 6.4: Minimum content requirement: topic must have at least 1 Feynman explanation OR 5 flashcards
