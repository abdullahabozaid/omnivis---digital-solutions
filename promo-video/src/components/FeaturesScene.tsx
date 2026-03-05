import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type FeaturesSceneProps = {
  primaryColor: string;
};

const features = [
  {
    icon: "📊",
    title: "Smart Dashboard",
    description: "Real-time analytics at your fingertips",
  },
  {
    icon: "👥",
    title: "Client Management",
    description: "Track leads and close deals faster",
  },
  {
    icon: "📋",
    title: "Task Automation",
    description: "Streamline your workflow effortlessly",
  },
  {
    icon: "📈",
    title: "Pipeline Tracking",
    description: "Visualize your sales journey",
  },
  {
    icon: "🎯",
    title: "Goal Setting",
    description: "Set targets, achieve results",
  },
  {
    icon: "🔔",
    title: "Smart Alerts",
    description: "Never miss an opportunity",
  },
];

export const FeaturesScene: React.FC<FeaturesSceneProps> = ({ primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Title entrance
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Exit animation
  const exitProgress = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, #0f172a 0%, #1e293b 100%)`,
        opacity: 1 - exitProgress,
        transform: `scale(${1 - exitProgress * 0.1})`,
      }}
    >
      {/* Grid Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(212, 175, 55, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 175, 55, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: `translate(-50%, 0) scale(${titleProgress})`,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            margin: 0,
          }}
        >
          Everything You Need to{" "}
          <span style={{ color: primaryColor }}>Succeed</span>
        </h2>
      </div>

      {/* Features Grid */}
      <div
        style={{
          position: "absolute",
          top: 220,
          left: "50%",
          transform: "translateX(-50%)",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 40,
          width: 1400,
        }}
      >
        {features.map((feature, index) => {
          const delay = index * 8;
          const entryFrame = fps * 0.3 + delay;

          const cardProgress = spring({
            frame: frame - delay,
            fps,
            config: { damping: 15, stiffness: 100 },
          });

          const cardOpacity = interpolate(frame, [entryFrame, entryFrame + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const cardY = interpolate(
            cardProgress,
            [0, 1],
            [60, 0]
          );

          // Floating animation
          const floatOffset = Math.sin((frame + index * 20) * 0.05) * 3;

          return (
            <div
              key={index}
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: 20,
                padding: 36,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                opacity: cardOpacity,
                transform: `translateY(${cardY + floatOffset}px) scale(${cardProgress})`,
                backdropFilter: "blur(10px)",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  fontSize: 36,
                  border: `1px solid ${primaryColor}30`,
                }}
              >
                {feature.icon}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "white",
                  fontFamily: "Inter, system-ui, sans-serif",
                  margin: "0 0 12px 0",
                }}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 17,
                  color: "rgba(255, 255, 255, 0.6)",
                  fontFamily: "Inter, system-ui, sans-serif",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Accent Lines */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
          opacity: titleProgress,
        }}
      />
    </AbsoluteFill>
  );
};
