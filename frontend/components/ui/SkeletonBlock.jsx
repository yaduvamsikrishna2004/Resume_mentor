function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton rounded-xl ${className}`.trim()} />;
}

export default SkeletonBlock;
