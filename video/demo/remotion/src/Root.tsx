import {Composition} from "remotion";
import {Demo} from "./Demo";
import {Thumb} from "./Thumb";
import plan from "../plan.json";

export const FPS = 30;
const last = plan.scenes[plan.scenes.length - 1] as {start: number; dur: number};
const total = last.start + last.dur;

export const Root = () => (
  <>
  <Composition id="Thumb" component={Thumb} durationInFrames={1} fps={30} width={1280} height={720} />
  <Composition id="Demo" component={Demo} durationInFrames={Math.round(total * FPS)} fps={FPS} width={1920} height={1080} />
  </>
);
