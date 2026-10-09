const COLORS = ["#004791", "#2F6B4F", "#C2571A", "#6B3FA0"];

// Samma seed ger alltid samma färg.
function colorFromSeed(seed = "") {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) {
    sum += seed.charCodeAt(i);
  }
  return COLORS[sum % COLORS.length];
}

export default function Avatar({ seed, name, size = 40 }) {
  const letter = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div
      className="flex items-center justify-center rounded-full font-sans font-medium text-white"
      style={{
        backgroundColor: colorFromSeed(seed),
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}
