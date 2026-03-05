import {
  AbsoluteFill,
  Sequence,
  useVideoConfig,
} from "remotion";
import { IntroScene } from "./components/IntroScene";
import { FeaturesScene } from "./components/FeaturesScene";
import { DashboardScene } from "./components/DashboardScene";
import { CallToActionScene } from "./components/CallToActionScene";

export type CrmPromoProps = {
  brandName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
};

export const CrmPromo: React.FC<CrmPromoProps> = ({
  brandName,
  tagline,
  primaryColor,
  secondaryColor,
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: secondaryColor }}>
      {/* Scene 1: Intro (0-4 seconds) */}
      <Sequence from={0} durationInFrames={4 * fps} premountFor={fps}>
        <IntroScene
          brandName={brandName}
          tagline={tagline}
          primaryColor={primaryColor}
        />
      </Sequence>

      {/* Scene 2: Features Showcase (4-9 seconds) */}
      <Sequence from={4 * fps} durationInFrames={5 * fps} premountFor={fps}>
        <FeaturesScene primaryColor={primaryColor} />
      </Sequence>

      {/* Scene 3: Dashboard Preview (9-12 seconds) */}
      <Sequence from={9 * fps} durationInFrames={3 * fps} premountFor={fps}>
        <DashboardScene primaryColor={primaryColor} />
      </Sequence>

      {/* Scene 4: Call to Action (12-15 seconds) */}
      <Sequence from={12 * fps} durationInFrames={3 * fps} premountFor={fps}>
        <CallToActionScene
          brandName={brandName}
          primaryColor={primaryColor}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
