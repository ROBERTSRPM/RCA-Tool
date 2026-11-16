import React from "react";
import {Audio, Composition, Series, staticFile} from "remotion";
import cfg from "../scenes.json";
import {SceneProvider} from "./lib";
import {SCENES} from "./scenes";

const FPS = cfg.fps;
const frames = (s: number) => Math.max(1, Math.round(s * FPS));
const total = cfg.scenes.reduce((a, s) => a + frames(s.duration), 0);

const Full: React.FC = () => (
  <>
    {cfg.audio ? <Audio src={staticFile(cfg.audio)} /> : null}
    <Series>
      {cfg.scenes.map((s) => {
        const Comp = SCENES[s.id];
        return (
          <Series.Sequence key={s.id} durationInFrames={frames(s.duration)} name={s.id + " " + s.title}>
            <SceneProvider dur={frames(s.duration)} id={s.id}><Comp /></SceneProvider>
          </Series.Sequence>
        );
      })}
    </Series>
  </>
);

export const Root: React.FC = () => (
  <>
    <Composition id="RCA" component={Full} durationInFrames={total} fps={FPS} width={1920} height={1080} />
    {cfg.scenes.map((s) => {
      const Comp = SCENES[s.id];
      const Wrapped: React.FC = () => (
        <SceneProvider dur={frames(s.duration)} id={s.id}><Comp /></SceneProvider>
      );
      return <Composition key={s.id} id={s.id} component={Wrapped} durationInFrames={frames(s.duration)} fps={FPS} width={1920} height={1080} />;
    })}
  </>
);
