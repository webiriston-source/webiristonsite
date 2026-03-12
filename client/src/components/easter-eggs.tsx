import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const LOFI_TRACKS = [
  {
    title: "Ayahuaska",
    artist: "Cheel",
    url: "/music/Ayahuaska.mp3",
  },
  {
    title: "IngwaR",
    artist: "Cheel",
    url: "/music/IngwaR.mp3",
  },
  {
    title: "Stairway To Heaven",
    artist: "Cheel",
    url: "/music/Stairway To Heaven.mp3",
  },
];

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dropsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const fontSize = 14;

    const initDrops = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const columns = Math.floor(canvas.width / fontSize);
      dropsRef.current = [];
      for (let i = 0; i < columns; i++) {
        dropsRef.current[i] = Math.random() * -100;
      }
    };

    initDrops();

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < dropsRef.current.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = dropsRef.current[i] * fontSize;

        ctx.fillStyle = `rgba(0, 255, 0, ${Math.random() * 0.5 + 0.5})`;
        ctx.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          dropsRef.current[i] = 0;
        }
        dropsRef.current[i]++;
      }
    };

    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      initDrops();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ background: "transparent" }}
      data-testid="matrix-canvas"
    />
  );
}

function LofiPlayer({ onClose }: { onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState([50]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.onended = null;
    }

    const audio = new Audio(LOFI_TRACKS[currentTrack].url);
    audio.loop = false;
    audio.volume = volume[0] / 100;

    audio.onended = () => {
      const nextIndex = (currentTrack + 1) % LOFI_TRACKS.length;
      setCurrentTrack(nextIndex);
      // проигрывание следующего трека запустится в эффекте ниже, если плеер в состоянии play
    };

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.onended = null;
        audioRef.current = null;
      }
    };
  }, [currentTrack, volume]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current
        .play()
        .then(() => {
          wasPlayingRef.current = true;
        })
        .catch(() => {});
    } else {
      audioRef.current.pause();
      wasPlayingRef.current = false;
    }
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume[0] / 100;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const changeTrack = useCallback((direction: "prev" | "next") => {
    const wasPlaying = isPlaying;
    wasPlayingRef.current = wasPlaying;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTrack((prev) => {
      if (direction === "next") {
        return (prev + 1) % LOFI_TRACKS.length;
      }
      return (prev - 1 + LOFI_TRACKS.length) % LOFI_TRACKS.length;
    });
  }, [isPlaying]);

  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    onClose();
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 left-6 z-50 w-72 bg-card border border-card-border rounded-md shadow-xl overflow-hidden"
      data-testid="lofi-player"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-card-border">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Lo-Fi Player</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="w-6 h-6"
          onClick={handleClose}
          data-testid="button-lofi-close"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Music className={`w-8 h-8 text-white ${isPlaying ? "animate-pulse" : ""}`} />
          </div>
          <p className="font-medium">{LOFI_TRACKS[currentTrack].title}</p>
          <p className="text-xs text-muted-foreground">
            {LOFI_TRACKS[currentTrack].artist}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Track {currentTrack + 1} of {LOFI_TRACKS.length}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            size="icon"
            variant="outline"
            onClick={() => changeTrack("prev")}
            data-testid="button-lofi-prev"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </Button>
          <Button
            size="icon"
            onClick={togglePlay}
            className="w-12 h-12"
            data-testid="button-lofi-play"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => changeTrack("next")}
            data-testid="button-lofi-next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 flex-shrink-0"
            onClick={() => setIsMuted(!isMuted)}
            data-testid="button-lofi-mute"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="flex-1"
            data-testid="slider-lofi-volume"
          />
        </div>
      </div>
    </motion.div>
  );
}

export function EasterEggs() {
  const [showLofi, setShowLofi] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowLofi((prev) => !prev);
      }
      
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setShowMatrix((prev) => !prev);
      }
      
      if (e.key === "Escape" && showMatrix) {
        e.preventDefault();
        setShowMatrix(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMatrix]);

  return (
    <>
      <AnimatePresence>
        {showLofi && <LofiPlayer onClose={() => setShowLofi(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showMatrix && (
          <>
            <MatrixRain />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black/80 border border-green-500/50 rounded-md"
              data-testid="matrix-overlay"
            >
              <p className="font-mono text-green-500 text-sm">
                Matrix Mode Active - Press ESC or Ctrl+M to exit
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
