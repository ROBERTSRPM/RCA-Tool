import {Composition} from "remotion";
import {Scene1, Scene2, S1_DUR, S2_DUR} from "./Story";
import {ThumbA, ThumbB, ThumbC, EndCardW} from "./Thumbs";
export const Root = () => (
  <>
    <Composition id="Scene1" component={Scene1} durationInFrames={Math.round(S1_DUR * 30)} fps={30} width={1920} height={1080} />
    <Composition id="Scene2" component={Scene2} durationInFrames={Math.round(S2_DUR * 30)} fps={30} width={1920} height={1080} />
    <Composition id="ThumbA" component={ThumbA} durationInFrames={1} fps={30} width={1280} height={720} />
    <Composition id="ThumbB" component={ThumbB} durationInFrames={1} fps={30} width={1280} height={720} />
    <Composition id="ThumbC" component={ThumbC} durationInFrames={1} fps={30} width={1280} height={720} />
    <Composition id="EndCard" component={EndCardW} durationInFrames={1} fps={30} width={1920} height={1080} />
  </>
);
