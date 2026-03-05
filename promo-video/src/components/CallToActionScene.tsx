import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type CallToActionSceneProps = {
  brandName: string;
  primaryColor: string;
};

export const CallToActionScene: React.FC<CallToActionSceneProps> = ({
  brandName,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main entrance animation
  const mainProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Button pulse animation
  const pulse = Math.sin(frame * 0.15) * 0.03 + 1;

  // Text reveal using spring
  const textSpring = spring({
    frame: frame - fps * 0.3,
    fps,
    config: { damping: 200 },
  });
  const textProgress = Math.max(0, Math.min(1, textSpring));

  // Rotating glow
  const glowRotation = frame * 0.5;

  // Particles burst effect using spring
  const burstSpring = spring({
    frame,
    fps,
    config: { damping: 20 },
  });

  const particles = Array.from({ length: 30 }, (_, i) => {
    const angle = (i / 30) * Math.PI * 2;
    const maxDistance = 300 + (i % 3) * 100;
    const distance = burstSpring * maxDistance;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const opacity = interpolate(frame, [fps * 0.2, fps * 1], [0.8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const size = 4 + (i % 4) * 2;

    return { x, y, opacity, size };
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)`,
      }}
    >
      {/* Animated Background Glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 800,
          height: 800,
          transform: `translate(-50%, -50%) rotate(${glowRotation}deg)`,
          background: `conic-gradient(from 0deg, ${primaryColor}20, transparent, ${primaryColor}10, transparent, ${primaryColor}20)`,
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
      />

      {/* Burst Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
            backgroundColor: i % 2 === 0 ? primaryColor : "white",
            borderRadius: "50%",
            opacity: p.opacity,
            boxShadow: `0 0 10px ${i % 2 === 0 ? primaryColor : "white"}`,
          }}
        />
      ))}

      {/* Center Content */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${mainProgress})`,
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 100,
            height: 100,
            margin: "0 auto 40px auto",
            borderRadius: 20,
            background: `linear-gradient(135deg, ${primaryColor} 0%, #B8860B 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 20px 60px rgba(212, 175, 55, 0.4)`,
            transform: `scale(${pulse})`,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            T
          </span>
        </div>

        {/* Main CTA Text */}
        <h2
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            margin: 0,
            opacity: textProgress,
            transform: `translateY(${interpolate(textProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          Start Growing{" "}
          <span style={{ color: primaryColor }}>Today</span>
        </h2>

        {/* Subtext */}
        <p
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.6)",
            fontFamily: "Inter, system-ui, sans-serif",
            margin: "24px 0 40px 0",
            opacity: textProgress,
            transform: `translateY(${interpolate(textProgress, [0, 1], [20, 0])}px)`,
          }}
        >
          Your all-in-one CRM solution awaits
        </p>

        {/* CTA Button */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 48px",
            borderRadius: 16,
            background: `linear-gradient(135deg, ${primaryColor} 0%, #B8860B 100%)`,
            boxShadow: `0 10px 40px rgba(212, 175, 55, 0.4)`,
            transform: `scale(${pulse * textProgress})`,
            opacity: textProgress,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#0f172a",
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: "1px",
            }}
          >
            GET STARTED FREE
          </span>
          <span style={{ fontSize: 28 }}>→</span>
        </div>

        {/* Brand Name */}
        <p
          style={{
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.3)",
            fontFamily: "Inter, system-ui, sans-serif",
            marginTop: 60,
            opacity: textProgress,
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          {brandName}
        </p>
      </div>

      {/* Corner Accents */}
      {[
        { left: 60, top: 60, rotation: 0 },
        { right: 60, top: 60, rotation: 90 },
        { right: 60, bottom: 60, rotation: 180 },
        { left: 60, bottom: 60, rotation: 270 },
      ].map((pos, i) => {
        const { rotation, ...position } = pos;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              ...position,
              width: 40,
              height: 40,
              borderLeft: `3px solid ${primaryColor}`,
              borderTop: `3px solid ${primaryColor}`,
              transform: `rotate(${rotation}deg)`,
              opacity: mainProgress * 0.5,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
