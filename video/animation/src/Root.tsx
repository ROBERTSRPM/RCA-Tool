import React from "react";
import {Audio, Composition, Series, staticFile} from "remotion";
import cfg from "../scenes.json";
import {SceneProvider} from "./lib";
import {SCENES} from "./scenes";
import {PresenterLayer, SceneCfg} from "./Presenter";

const FPS = cfg.fps;
const frames = (s: number) => Math.max(1, Math.round(s * FPS));
const scenes = cfg.scenes as SceneCfg[];
const total = scenes.reduce((a, s) => a + frames(s.duration), 0);

const SceneView: React.FC<{s: SceneCfg}> = ({s}) => {
  const Comp = SCENES[s.id];
  return (
    <SceneProvider dur={frames(s.duration)} id={s.id}>
      <Comp />
      <PresenterLayer scene={s} />
    </SceneProvider>
  );
};

const Full: React.FC = () => (
  <>
    {cfg.audio ? <Audio src={staticFile(cfg.audio)} /> : null}
    <Series>
      {scenes.map((s) => (
        <Series.Sequence key={s.id} durationInFrames={frames(s.duration)} name={s.id + " " + s.title}>
          <SceneView s={s} />
        </Series.Sequence>
      ))}
    </Series>
  </>
);

export const Root: React.FC = () => (
  <>
    <Composition id="RCA" component={Full} durationInFrames={total} fps={FPS} width={1920} height={1080} />
    {scenes.map((s) => {
      const Wrapped: React.FC = () => <SceneView s={s} />;
      return <Composition key={s.id} id={s.id} component={Wrapped} durationInFrames={frames(s.duration)} fps={FPS} width={1920} height={1080} />;
    })}
  </>
);
