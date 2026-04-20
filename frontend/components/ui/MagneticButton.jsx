import { useRef, useState } from "react";
import { motion } from "framer-motion";

function MagneticButton({ className = "", children, onClick, type = "button", disabled = false }) {
  const ref = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState([]);

  function handleMove(event) {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    setCoords({ x: x * 0.16, y: y * 0.16 });
  }

  function handleLeave() {
    setCoords({ x: 0, y: 0 });
  }

  function handleClick(event) {
    const bounds = ref.current?.getBoundingClientRect();
    if (bounds) {
      const size = Math.max(bounds.width, bounds.height);
      const ripple = {
        id: Date.now(),
        x: event.clientX - bounds.left - size / 2,
        y: event.clientY - bounds.top - size / 2,
        size
      };
      setRipples((prev) => [...prev, ripple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((item) => item.id !== ripple.id));
      }, 650);
    }
    onClick?.(event);
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={{ x: coords.x, y: coords.y }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`relative overflow-hidden ${className}`}
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple"
          style={{ width: ripple.size, height: ripple.size, left: ripple.x, top: ripple.y }}
        />
      ))}
      {children}
    </motion.button>
  );
}

export default MagneticButton;
