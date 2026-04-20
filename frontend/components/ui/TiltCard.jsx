import { useRef, useState } from "react";
import { motion } from "framer-motion";

function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const [rotation, setRotation] = useState({ rx: 0, ry: 0 });

  function handleMouseMove(event) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setRotation({
      rx: (0.5 - py) * 8,
      ry: (px - 0.5) * 10
    });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setRotation({ rx: 0, ry: 0 })}
      animate={{
        rotateX: rotation.rx,
        rotateY: rotation.ry
      }}
      transition={{ type: "spring", stiffness: 210, damping: 20 }}
      style={{ transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default TiltCard;
