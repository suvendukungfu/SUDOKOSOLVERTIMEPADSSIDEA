export default function Controls({ onLock, onReset }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        justifyContent: "center",
        marginTop: "24px",
      }}
    >
      <button
        onClick={onLock}
        style={{
          padding: "12px 24px",
          borderRadius: "14px",
          background: "#121829",
          color: "#4fd1c5",
          border: "2px solid #4fd1c5",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        🔒 Set as Given
      </button>

      <button
        onClick={onReset}
        style={{
          padding: "12px 24px",
          borderRadius: "14px",
          background: "transparent",
          color: "#9f7aea",
          border: "2px solid #9f7aea",
          fontSize: "15px",
          cursor: "pointer",
        }}
      >
        ↺ Reset
      </button>
    </div>
  );
}
