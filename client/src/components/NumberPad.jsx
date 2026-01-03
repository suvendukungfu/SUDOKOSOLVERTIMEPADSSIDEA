export default function NumberPad({ onPress }) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 60px)",
          gap: "12px",
          justifyContent: "center",
          marginTop: "24px",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => onPress?.(num)}
            style={{
              height: "48px",
              borderRadius: "12px",
              background: "#121829",
              color: "white",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => onPress?.("delete")}
          style={{
            gridColumn: "span 3",
            height: "48px",
            borderRadius: "12px",
            background: "#2a1418",
            color: "#ef4444",
            border: "1px solid rgba(255,255,255,0.08)",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: "20px" }} />
    </>
  );
}
