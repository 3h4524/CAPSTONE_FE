"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export interface RevealProps {
  children: ReactNode;
  delay?: number;
}

export const Reveal = ({ children, delay = 0 }: RevealProps) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};
