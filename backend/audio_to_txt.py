import argparse
import math
import os
import queue
import sys
import time
from datetime import datetime

import numpy as np
try:
    import sounddevice as sd
except Exception:
    sd = None

try:
    import soundfile as sf
except Exception:
    sf = None

try:
    import speech_recognition as sr
except Exception:
    sr = None

# audioop-lts provides the audioop module in Python 3.13+
try:
    import audioop
except ImportError:
    pass

SAMPLE_RATE = 16000  # 16 kHz mono PCM WAV
CHANNELS = 1
DEFAULT_DURATION_SECONDS = 300  # 5 minutes


def format_seconds(seconds: float) -> str:
    """Formats seconds into MM:SS format."""
    mins = int(seconds) // 60
    secs = int(seconds) % 60
    return f"{mins:02d}:{secs:02d}"


# ==========================================
# 1. RECORD AUDIO
# ==========================================
def record_audio(duration: int = DEFAULT_DURATION_SECONDS) -> np.ndarray:
    """
    Records audio from the default microphone for up to `duration` seconds.
    Users can press Ctrl+C at any time to stop recording early and transcribe immediately.
    """
    audio_queue = queue.Queue()

    def callback(indata, frames, time_info, status):
        if status:
            print(f"\n[Warning] Audio stream status: {status}", file=sys.stderr)
        audio_queue.put(indata.copy())

    print(f"\n[1/4] Starting recording for up to {format_seconds(duration)} ({duration}s)...")
    print("      👉 Press Ctrl+C at any time to stop early and transcribe.\n")

    start_time = time.time()
    collected_frames = []

    try:
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype="float32",
            callback=callback,
        ):
            while True:
                elapsed = time.time() - start_time
                if elapsed >= duration:
                    break

                # Live timer display
                print(
                    f"\r🔴 Recording: [{format_seconds(elapsed)} / {format_seconds(duration)}] "
                    f"- Press Ctrl+C to stop",
                    end="",
                    flush=True,
                )

                while not audio_queue.empty():
                    collected_frames.append(audio_queue.get_nowait())

                time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n\n⏹  Recording stopped early by user.")

    # Flush remaining frames
    while not audio_queue.empty():
        collected_frames.append(audio_queue.get_nowait())

    total_recorded_time = time.time() - start_time
    print(f"\n✓ Finished recording! Total duration: {format_seconds(total_recorded_time)}")

    if not collected_frames:
        raise RuntimeError("No audio data was captured.")

    return np.concatenate(collected_frames, axis=0)


# ==========================================
# 2. SAVE AUDIO TO INPUT FOLDER
# ==========================================
def save_audio(audio_data: np.ndarray, output_dir: str = "input") -> str:
    """
    Saves the recorded audio array into the input folder as a WAV file.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(output_dir, f"recording_{timestamp}.wav")

    sf.write(file_path, audio_data, SAMPLE_RATE, subtype="PCM_16")
    print(f"\n[2/4] Audio saved to input folder: {file_path}")
    return file_path


# ==========================================
# 3. TRANSCRIBE AUDIO TO TEXT
# ==========================================
def transcribe_audio(audio_path: str, chunk_duration: int = 45) -> str:
    """
    Transcribes audio using Google Web Speech API via SpeechRecognition.
    Processes long audio (e.g. 5 minutes) in 45-second chunks for reliability.
    """
    print(f"\n[3/4] Transcribing audio from: {audio_path}")
    recognizer = sr.Recognizer()
    transcriptions = []

    with sr.AudioFile(audio_path) as source:
        total_duration = source.DURATION
        total_chunks = max(1, math.ceil(total_duration / chunk_duration))
        print(f"      Audio duration: {format_seconds(total_duration)} (~{total_chunks} chunk(s))\n")

        chunk_idx = 1
        while True:
            audio_segment = recognizer.record(source, duration=chunk_duration)
            if len(audio_segment.frame_data) == 0:
                break

            print(f"      Transcribing chunk {chunk_idx}/{total_chunks}...", end=" ", flush=True)
            try:
                text = recognizer.recognize_google(audio_segment)
                transcriptions.append(text)
                print(f"Done: \"{text}\"")
            except sr.UnknownValueError:
                print("(No speech detected in this chunk)")
            except sr.RequestError as e:
                print(f"[API Error]: {e}")

            chunk_idx += 1

    full_transcript = " ".join(transcriptions).strip()
    return full_transcript


# ==========================================
# 4. SAVE TEXT TO OUTPUT FOLDER
# ==========================================
def save_transcript(text: str, output_dir: str = "output") -> str:
    """
    Saves the transcription to the output folder as a text file.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(output_dir, f"transcript_{timestamp}.txt")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text + "\n")

    print(f"\n[4/4] Transcript saved to output folder: {output_path}")
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Record audio for up to 5 minutes, save to input/, transcribe, and save to output/."
    )
    parser.add_argument(
        "--duration",
        "-d",
        type=int,
        default=DEFAULT_DURATION_SECONDS,
        help=f"Recording duration in seconds (default: {DEFAULT_DURATION_SECONDS}s = 5 minutes).",
    )
    parser.add_argument(
        "--file",
        "-f",
        type=str,
        default=None,
        help="Optional: Path to an existing audio file to transcribe directly without recording.",
    )

    args = parser.parse_args()

    # Step 1: Record audio (or use existing file)
    if args.file:
        if not os.path.exists(args.file):
            print(f"Error: Specified file does not exist: {args.file}", file=sys.stderr)
            sys.exit(1)
        audio_file_path = args.file
    else:
        # record audio
        audio_data = record_audio(duration=args.duration)
        # save the audio to input folder
        audio_file_path = save_audio(audio_data)

    # Step 3: Transcribe audio to text
    transcript = transcribe_audio(audio_file_path)

    # Step 4: Save the text to output folder
    if transcript:
        output_file_path = save_transcript(transcript)
        print("\n" + "=" * 60)
        print("FINAL TRANSCRIPTION:")
        print("=" * 60)
        print(transcript)
        print("=" * 60 + "\n")
    else:
        print("\n⚠️  No speech could be recognized from the recording.")


if __name__ == "__main__":
    main()