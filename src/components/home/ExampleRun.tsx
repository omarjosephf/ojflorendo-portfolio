"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

interface ExampleRunContent {
  title: string;
  caption: string;
  steps: ReadonlyArray<{ title: string; detail: string }>;
}

const STEP_MS = 1100;
const START_MS = 700;

type StepState = "done" | "active" | "waiting";

function stateOf(index: number, completed: number): StepState {
  if (index < completed) return "done";
  if (index === completed) return "active";
  return "waiting";
}

const SPOKEN: Record<StepState, string> = {
  done: "done",
  active: "in progress",
  waiting: "waiting",
};

/**
 * The hero's one orchestrated moment: an example automation runs once, step by
 * step, and then rests. Server HTML shows the finished run, so the content is
 * complete without JavaScript and with reduced motion; with motion allowed, the
 * markers reset and play through once after hydration. Only the step markers
 * change; the text never hides.
 */
export function ExampleRun({ content: exampleRun }: { content: ExampleRunContent }) {
  const total: number = exampleRun.steps.length;
  const [completed, setCompleted] = useState<number>(total);
  const [canReplay, setCanReplay] = useState(false);
  const timers = useRef<number[]>([]);

  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };

  const play = useCallback(() => {
    clear();
    timers.current.push(window.setTimeout(() => setCompleted(0), 0));
    for (let step = 1; step <= total; step += 1) {
      timers.current.push(
        window.setTimeout(() => setCompleted(step), START_MS + step * STEP_MS),
      );
    }
  }, [total]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return clear;
    play();
    timers.current.push(window.setTimeout(() => setCanReplay(true), 0));
    return clear;
  }, [play]);

  const finished = completed >= total;

  return (
    <figure className="jf-run" aria-labelledby="example-run-title">
      <div className="jf-run-head">
        <p id="example-run-title" className="jf-run-title">{exampleRun.title}</p>
        <span className="jf-run-tag">Example</span>
      </div>
      <ol className="jf-run-steps">
        {exampleRun.steps.map((step, index) => {
          const state = stateOf(index, completed);
          return (
            <li key={step.title} className="jf-run-step" data-state={state}>
              <span className="jf-run-marker" aria-hidden="true">
                {state === "done" ? <Check size={14} strokeWidth={3} /> : null}
              </span>
              <span className="jf-run-copy">
                <span className="jf-run-step-title">
                  {step.title}
                  <span className="sr-only">{`, ${SPOKEN[state]}`}</span>
                </span>
                <span className="jf-run-step-detail">{step.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <figcaption className="jf-run-foot">
        <span>{exampleRun.caption}</span>
        {canReplay ? (
          <button
            type="button"
            className="jf-run-replay"
            onClick={play}
            disabled={!finished}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Replay
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}
