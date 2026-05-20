import modal
import io
import subprocess

app = modal.App("kokoro-tts")

image = (
    modal.Image.debian_slim()
    .apt_install("espeak-ng", "ffmpeg")
    .pip_install("kokoro", "torch", "soundfile", "fastapi[standard]")
)


@app.cls(gpu="T4", image=image, scaledown_window=300)
class KokoroTTS:
    @modal.enter()
    def load_model(self):
        from kokoro import KPipeline

        self.pipeline = KPipeline(lang_code="a")

    @modal.fastapi_endpoint(method="POST")
    def synthesize(self, request: dict):
        import soundfile as sf
        from fastapi.responses import Response
        import numpy as np

        text = request.get("text", "")
        voice = request.get("voice", "af_heart")

        if not text:
            return Response(content="text is required", status_code=400)

        generator = self.pipeline(text, voice=voice, split_pattern=r'(?<=[.!?])\s+')
        audio_segments = []
        for _, _, audio in generator:
            if audio is not None:
                audio_segments.append(audio.cpu().numpy() if hasattr(audio, 'cpu') else audio)

        if not audio_segments:
            return Response(content="no audio generated", status_code=500)

        full_audio = np.concatenate(audio_segments)

        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, full_audio, 24000, format="WAV")
        wav_buffer.seek(0)

        mp3_bytes = subprocess.run(
            ["ffmpeg", "-i", "pipe:0", "-f", "mp3", "-ab", "128k", "pipe:1"],
            input=wav_buffer.read(),
            capture_output=True,
            check=True,
        ).stdout

        return Response(content=mp3_bytes, media_type="audio/mpeg")
