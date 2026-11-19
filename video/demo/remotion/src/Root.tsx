import {Composition} from "remotion";
import {Demo} from "./Demo";
import plan from "../plan.json";

export const FPS = 30;
const total = plan.scenes.reduce((a: number, s: {target: number}) => a + s.target, 0);

export const Root = () => (
  <Composition id="Demo" component={Demo} durationInFrames={Math.round(total * FPS)} fps={FPS} width={1920} height={1080} />
);
