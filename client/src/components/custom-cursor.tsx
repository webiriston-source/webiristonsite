import { useEffect, useState, useCallback } from "react";
import { motion, useSpring } from "framer-motion";

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, textarea, [data-cursor-hover]';

export function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const cursorX = useSpring(0, { stiffness: 500, damping: 28 });
  const cursorY = useSpring(0, { stiffness: 500, damping: 28 });

  const isInteractiveElement = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    return target.closest(INTERACTIVE_SELECTOR) !== null;
  }, []);

  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const handleMouseOver = (e: MouseEvent) => {
      if (isInteractiveElement(e.target)) {
        setIsHovering(true);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (isInteractiveElement(e.target)) {
        const relatedTarget = e.relatedTarget as Element | null;
        if (!relatedTarget || !isInteractiveElement(relatedTarget)) {
          setIsHovering(false);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.body.addEventListener("mouseenter", handleMouseEnter);
    document.body.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.body.removeEventListener("mouseenter", handleMouseEnter);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, [cursorX, cursorY, isVisible, isInteractiveElement]);

  if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
    return null;
  }

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference hidden md:block"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      >
        <motion.div
          className="rounded-full bg-white"
          initial={{ width: 12, height: 12, opacity: 0 }}
          animate={{
            width: isHovering ? 48 : 12,
            height: isHovering ? 48 : 12,
            opacity: isVisible ? 1 : 0,
          }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
      </motion.div>
      <style>{`
        @media (min-width: 768px) {
          * { cursor: none !important; }
        }
      `}</style>
    </>
  );
}
