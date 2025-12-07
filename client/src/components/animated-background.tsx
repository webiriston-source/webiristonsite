import { useRef } from "react";
import { motion } from "framer-motion";

interface Shape {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  type: "circle" | "triangle" | "square" | "hexagon";
  delay: number;
  duration: number;
}

function generateShapes(): Shape[] {
  return Array.from({ length: 15 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 60 + 20,
    rotation: Math.random() * 360,
    type: ["circle", "triangle", "square", "hexagon"][Math.floor(Math.random() * 4)] as Shape["type"],
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 15,
  }));
}

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<Shape[] | null>(null);
  
  if (!shapesRef.current) {
    shapesRef.current = generateShapes();
  }
  
  const shapes = shapesRef.current;

  const renderShape = (shape: Shape) => {
    const baseClasses = "absolute opacity-[0.03] dark:opacity-[0.05]";
    
    switch (shape.type) {
      case "circle":
        return (
          <div
            className={`${baseClasses} rounded-full border-2 border-primary`}
            style={{ width: shape.size, height: shape.size }}
          />
        );
      case "square":
        return (
          <div
            className={`${baseClasses} border-2 border-primary`}
            style={{ width: shape.size, height: shape.size }}
          />
        );
      case "triangle":
        return (
          <div
            className={baseClasses}
            style={{
              width: 0,
              height: 0,
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid hsl(var(--primary) / 0.1)`,
            }}
          />
        );
      case "hexagon":
        return (
          <svg
            className={baseClasses}
            width={shape.size}
            height={shape.size}
            viewBox="0 0 100 100"
          >
            <polygon
              points="50 1 95 25 95 75 50 99 5 75 5 25"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          </svg>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute"
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            rotate: [shape.rotation, shape.rotation + 180, shape.rotation + 360],
          }}
          transition={{
            duration: shape.duration,
            delay: shape.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {renderShape(shape)}
        </motion.div>
      ))}

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-chart-2/5 rounded-full blur-3xl" />
    </div>
  );
}
