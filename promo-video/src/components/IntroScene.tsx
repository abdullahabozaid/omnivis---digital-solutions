import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type IntroSceneProps = {
  brandName: string;
  tagline: string;
  primaryColor: string;
};

export const IntroScene: React.FC<IntroSceneProps> = ({
  brandName,
  tagline,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Logo entrance animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const logoRotation = interpolate(
    spring({ frame, fps, config: { damping: 200 } }),
    [0, 1],
    [-180, 0]
  );

  // Brand name typewriter effect - using spring for smooth motion
  const textSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200 },
  });
  const textProgress = Math.max(0, Math.min(1, textSpring));
  const displayText = brandName.slice(0, Math.floor(textProgress * brandName.length));

  // Tagline fade in
  const taglineOpacity = interpolate(frame, [fps * 1.5, fps * 2.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineSpring = spring({
    frame: frame - fps * 1.5,
    fps,
    config: { damping: 200 },
  });
  const taglineY = interpolate(taglineSpring, [0, 1], [30, 0]);

  // Exit animation
  const exitProgress = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const overallOpacity = 1 - exitProgress;
  const overallScale = 1 - exitProgress * 0.1;

  // Animated background particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const startX = (i * 137.5) % 100;
    const startY = ((i * 97.3) % 100);
    const speed = 0.5 + (i % 3) * 0.3;
    const size = 3 + (i % 4) * 2;
    const delay = (i % 5) * 10;

    const progress = ((frame + delay) * speed) % 200;
    const y = startY + progress * 0.5;
    const opacity = interpolate(progress, [0, 50, 150, 200], [0, 0.3, 0.3, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return { x: startX, y: y % 120 - 10, size, opacity };
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)`,
        opacity: overallOpacity,
        transform: `scale(${overallScale})`,
      }}
    >
      {/* Animated Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: primaryColor,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px ${primaryColor}`,
          }}
        />
      ))}

      {/* Radial Gradient Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)`,
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${logoScale}) rotate(${logoRotation}deg)`,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${primaryColor} 0%, #B8860B 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 20px 60px rgba(212, 175, 55, 0.4)`,
          }}
        >
          <span
            style={{
              fontSize: 60,
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            T
          </span>
        </div>
      </div>

      {/* Brand Name */}
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-2px",
            margin: 0,
            textShadow: `0 4px 40px rgba(212, 175, 55, 0.3)`,
          }}
        >
          {displayText}
          <span
            style={{
              opacity: frame % 30 < 15 ? 1 : 0,
              color: primaryColor,
            }}
          >
            |
          </span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: 32,
            color: primaryColor,
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 500,
            marginTop: 20,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          {tagline}
        </p>
      </div>

      {/* Decorative Lines */}
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 16,
          opacity: taglineOpacity,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: i === 1 ? 60 : 30,
              height: 4,
              backgroundColor: i === 1 ? primaryColor : "rgba(255,255,255,0.3)",
              borderRadius: 2,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
