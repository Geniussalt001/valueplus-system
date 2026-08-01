import {
  useEffect,
  useRef,
  useState,
} from "react";

export interface AnimatedProgressOptions {
  start?: number;
  ceiling?: number;
  intervalMs?: number;
  completionHoldMs?: number;
}

export function useAnimatedProgress(
  active: boolean,
  options: AnimatedProgressOptions = {},
) {
  const {
    start = 8,
    ceiling = 92,
    intervalMs = 180,
    completionHoldMs = 650,
  } = options;
  const [progress, setProgress] =
    useState(0);
  const wasActiveRef =
    useRef(false);

  useEffect(() => {
    let progressTimer:
      | number
      | undefined;
    let resetTimer:
      | number
      | undefined;

    if (active) {
      wasActiveRef.current = true;
      setProgress((current) =>
        current <= 0 || current >= 100
          ? start
          : current,
      );

      progressTimer = window.setInterval(
        () => {
          setProgress((current) => {
            if (current >= ceiling) {
              return ceiling;
            }

            const step = Math.max(
              1,
              Math.ceil(
                (ceiling - current) * 0.09,
              ),
            );

            return Math.min(
              ceiling,
              current + step,
            );
          });
        },
        intervalMs,
      );
    } else if (wasActiveRef.current) {
      wasActiveRef.current = false;
      setProgress(100);
      resetTimer = window.setTimeout(
        () => {
          setProgress(0);
        },
        completionHoldMs,
      );
    }

    return () => {
      if (progressTimer !== undefined) {
        window.clearInterval(
          progressTimer,
        );
      }

      if (resetTimer !== undefined) {
        window.clearTimeout(
          resetTimer,
        );
      }
    };
  }, [
    active,
    ceiling,
    completionHoldMs,
    intervalMs,
    start,
  ]);

  return progress;
}
