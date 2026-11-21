"use client";

import { useEffect, useRef } from "react";

import { PROCESS_TRAVEL_EASING, PROCESS_TRAVEL_MS } from "@/constants/workflow-run-effects";
import { useProcessDotsStore } from "@/stores/process-dots";
import { cubicBezier } from "@/utils/cubic-bezier";

const travelEase = cubicBezier(...PROCESS_TRAVEL_EASING);

type ProcessTokenProps = {
  edgeId: string;
  path: string;
  onArrive: () => void;
};

export const ProcessToken = ({ edgeId, path, onArrive }: ProcessTokenProps) => {
  const trailRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const arrive = useRef(onArrive);

  useEffect(() => {
    arrive.current = onArrive;
  });

  useEffect(() => {
    const trail = trailRef.current;
    const dot = dotRef.current;
    if (!trail || !dot) return;
    const { place, remove } = useProcessDotsStore.getState();
    const length = trail.getTotalLength();
    const startedAt = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / PROCESS_TRAVEL_MS);
      const eased = travelEase(progress);
      const point = trail.getPointAtLength(length * eased);
      dot.setAttribute("transform", `translate(${point.x} ${point.y})`);
      trail.style.strokeDashoffset = `${1 - eased}`;
      if (progress < 1) {
        place(edgeId, { x: point.x, y: point.y });
        frame = requestAnimationFrame(step);
        return;
      }
      remove(edgeId);
      arrive.current();
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      remove(edgeId);
    };
  }, [edgeId, path]);

  return (
    <g className="pointer-events-none">
      <path
        ref={trailRef}
        d={path}
        pathLength={1}
        fill="none"
        strokeLinecap="round"
        className="stroke-wf-process [stroke-width:2.25] [stroke-dasharray:1] [stroke-dashoffset:1]"
      />
      <g ref={dotRef}>
        <circle r={10} className="fill-wf-process/30" />
        <circle r={4.5} className="fill-wf-process stroke-wf-surface [stroke-width:1.5]" />
      </g>
    </g>
  );
};
