import { Composition } from "remotion";
import { CrmPromo } from "./CrmPromo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="CrmPromo"
      component={CrmPromo}
      durationInFrames={450} // 15 seconds at 30fps
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        brandName: "Tawfeeq",
        tagline: "Your Business, Elevated",
        primaryColor: "#D4AF37", // Gold
        secondaryColor: "#1F2937", // Dark gray
      }}
    />
  );
};
