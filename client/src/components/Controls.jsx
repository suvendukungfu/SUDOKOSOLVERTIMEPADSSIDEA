export default function Controls() {
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        justifyContent: "center",
        marginTop: "32px",
      }}
    >
      <button
        style={{
          padding: "14px 32px",
          borderRadius: "14px",
          background: "#4fd1c5",
          color: "#0b0f1a",
          fontSize: "16px",
          fontWeight: 600,
          border: "none",
        }}
      >
        ✨ Solve Puzzle
      </button>

      <button
        style={{
          padding: "14px 32px",
          borderRadius: "14px",
          background: "transparent",
          color: "#9f7aea",
          border: "2px solid #9f7aea",
          fontSize: "16px",
        }}
      >
        ↺ Reset
      </button>
    </div>
  );
}
