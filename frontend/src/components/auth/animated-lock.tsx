"use client";

import { useEffect, useRef, useState } from "react";
import { Lottie, type LottieHandle } from "lottie-react";
import { cn } from "cn";

const LOCKED_FRAME = 78;
const OPEN_START = 79;
const OPEN_END = 92;

export function AnimatedLock({
  unlocked,
  shake,
  onComplete,
  className,
}: {
  unlocked: boolean;
  shake?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const lottieRef = useRef<LottieHandle>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const prevShakeRef = useRef(0);
  const [shaking, setShaking] = useState(false);
  onCompleteRef.current = onComplete;

  function handleComplete() {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current?.();
  }

  useEffect(() => {
    if (!unlocked) return;
    const t = setTimeout(handleComplete, 2500);
    lottieRef.current?.playSegments([OPEN_START, OPEN_END]);
    return () => clearTimeout(t);
  }, [unlocked]);

  useEffect(() => {
    if (!shake || shake === prevShakeRef.current) return;
    prevShakeRef.current = shake;
    setShaking(false);
    const raf = requestAnimationFrame(() => setShaking(true));
    const t = setTimeout(() => setShaking(false), 700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [shake]);

  return (
    <Lottie
      lottieRef={lottieRef}
      src="/animations/login-time.json"
      segment={[LOCKED_FRAME, OPEN_END]}
      loop={false}
      autoplay={false}
      subscriptions={{ complete: handleComplete }}
      className={cn(className, shaking && "animate-shake")}
      style={{ width: 120, height: 120 }}
    />
  );
}