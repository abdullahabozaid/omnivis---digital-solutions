import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

type DashboardSceneProps = {
  primaryColor: string;
};

export const DashboardScene: React.FC<DashboardSceneProps> = ({ primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Dashboard entrance
  const dashboardProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const dashboardScale = interpolate(dashboardProgress, [0, 1], [0.8, 1]);
  const dashboardOpacity = interpolate(dashboardProgress, [0, 1], [0, 1]);

  // Chart animation using spring for smooth motion
  const chartSpring = spring({
    frame: frame - fps * 0.5,
    fps,
    config: { damping: 200 },
  });
  const chartProgress = Math.max(0, Math.min(1, chartSpring));

  // Exit animation
  const exitProgress = interpolate(
    frame,
    [durationInFrames - fps * 0.5, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Sample chart data
  const chartData = [35, 55, 45, 70, 60, 85, 75, 95];
  const maxValue = Math.max(...chartData);

  // Stats that animate
  const stats = [
    { label: "Active Clients", value: Math.floor(interpolate(chartProgress, [0, 1], [0, 247])), suffix: "", color: primaryColor },
    { label: "Revenue", value: Math.floor(interpolate(chartProgress, [0, 1], [0, 89])), suffix: "K", color: "#22c55e" },
    { label: "Tasks Done", value: Math.floor(interpolate(chartProgress, [0, 1], [0, 156])), suffix: "", color: "#3b82f6" },
    { label: "Conversion", value: Math.floor(interpolate(chartProgress, [0, 1], [0, 73])), suffix: "%", color: "#a855f7" },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0f172a 0%, #1e293b 100%)`,
        opacity: 1 - exitProgress,
        transform: `scale(${1 - exitProgress * 0.1})`,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: "50%",
          transform: `translateX(-50%) scale(${dashboardProgress})`,
          opacity: dashboardOpacity,
        }}
      >
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            margin: 0,
            textAlign: "center",
          }}
        >
          Your Command Center
        </h2>
        <p
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "Inter, system-ui, sans-serif",
            margin: "12px 0 0 0",
            textAlign: "center",
          }}
        >
          Beautiful analytics, powerful insights
        </p>
      </div>

      {/* Dashboard Container */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: "50%",
          transform: `translateX(-50%) scale(${dashboardScale})`,
          opacity: dashboardOpacity,
          width: 1600,
          height: 700,
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: 24,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: 40,
          display: "flex",
          gap: 30,
        }}
      >
        {/* Left: Stats Cards */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: 320,
          }}
        >
          {stats.map((stat, index) => {
            const delay = index * 5;
            const cardProgress = spring({
              frame: frame - delay,
              fps,
              config: { damping: 15 },
            });

            return (
              <div
                key={index}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: 16,
                  padding: 24,
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  transform: `translateX(${interpolate(cardProgress, [0, 1], [-50, 0])}px)`,
                  opacity: cardProgress,
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(255, 255, 255, 0.5)",
                    fontFamily: "Inter, system-ui, sans-serif",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: 42,
                    fontWeight: 700,
                    color: stat.color,
                    fontFamily: "Inter, system-ui, sans-serif",
                    margin: "8px 0 0 0",
                  }}
                >
                  {stat.label === "Revenue" ? "£" : ""}
                  {stat.value}
                  {stat.suffix}
                </p>
              </div>
            );
          })}
        </div>

        {/* Right: Chart */}
        <div
          style={{
            flex: 1,
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: 20,
            padding: 30,
            border: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "white",
              fontFamily: "Inter, system-ui, sans-serif",
              margin: "0 0 30px 0",
            }}
          >
            Revenue Growth
          </h3>

          {/* Bar Chart */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              gap: 30,
              paddingBottom: 20,
            }}
          >
            {chartData.map((value, index) => {
              const barHeight = (value / maxValue) * 400;
              const animatedHeight = barHeight * chartProgress;
              const delay = index * 3;

              const barProgress = spring({
                frame: frame - delay,
                fps,
                config: { damping: 12 },
              });

              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: animatedHeight,
                      borderRadius: 8,
                      background: `linear-gradient(180deg, ${primaryColor} 0%, ${primaryColor}80 100%)`,
                      transform: `scaleY(${barProgress})`,
                      transformOrigin: "bottom",
                      boxShadow: `0 0 20px ${primaryColor}40`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: "rgba(255, 255, 255, 0.4)",
                      fontFamily: "Inter, system-ui, sans-serif",
                    }}
                  >
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"][index]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      {[0, 1, 2].map((i) => {
        const floatY = Math.sin((frame + i * 30) * 0.08) * 10;
        const floatX = Math.cos((frame + i * 20) * 0.06) * 8;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 100 + i * 700,
              top: 300 + i * 100,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: primaryColor,
              opacity: 0.3,
              transform: `translate(${floatX}px, ${floatY}px)`,
              boxShadow: `0 0 20px ${primaryColor}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
