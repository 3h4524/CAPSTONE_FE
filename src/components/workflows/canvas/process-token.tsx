"use client";

import { useEffect, useRef } from "react";

import { PROCESS_TRAVEL_MS } from "@/constants/workflow-run-effects";

type ProcessTokenProps = {
  path: string;
  onArrive: () => void;
};

export const ProcessToken = ({ path, onArrive }: ProcessTokenProps) => {
  const motionRef = useRef<SVGAnimateMotionElement>(null);

  useEffect(() => {
    motionRef.current?.beginElement();
  }, []);

  return (
    <g className="pointer-events-none">
      <path
        d={path}
        pathLength={1}
        fill="none"
        strokeLinecap="round"
        className="stroke-wf-process animate-wf-process-trail [stroke-width:2.25] [stroke-dasharray:1] [stroke-dashoffset:1]"
        onAnimationEnd={onArrive}
      />
      <g>
        <circle r={10} className="fill-wf-process/30" />
        <circle r={4.5} className="fill-wf-process stroke-wf-surface [stroke-width:1.5]" />
        <animateMotion
          ref={motionRef}
          begin="indefinite"
          dur={`${PROCESS_TRAVEL_MS}ms`}
          fill="freeze"
          calcMode="spline"
          keyPoints="0;1"
          keyTimes="0;1"
          keySplines="0.65 0 0.35 1"
          path={path}
        />
      </g>
    </g>
  );
};
