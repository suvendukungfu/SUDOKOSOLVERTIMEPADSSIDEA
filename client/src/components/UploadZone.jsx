export default function UploadZone() {
  return (
    <div
      className="card"
      style={{
        borderStyle: "dashed",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "32px", marginBottom: "12px" }}>⬆️</div>
      <p style={{ fontSize: "18px", marginBottom: "6px" }}>
        Drop your Sudoku image here
      </p>
      <p style={{ color: "#9ca3af", fontSize: "14px" }}>
        or click to browse • PNG, JPG up to 10MB
      </p>
    </div>
  );
}
