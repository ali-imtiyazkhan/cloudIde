"use client";

import { useEffect, useRef } from "react";
import styles from "./video-background.module.css";

export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPlayback = () => {
      if (motion.matches || document.hidden) {
        video.pause();
        return;
      }
      const play = video.play();
      if (play) play.catch(() => {});
    };

    syncPlayback();
    motion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);

    return () => {
      motion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, []);

  return (
    <div className={styles.root} aria-hidden>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/bg-video.mp4" type="video/mp4" />
      </video>
      <div className={styles.wash} />
      <div className={styles.vignette} />
      <div className={styles.grain} />
    </div>
  );
}
