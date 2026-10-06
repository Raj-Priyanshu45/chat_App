const BrandMark = ({ compact = false }) => (
  <span className="brand-lockup" aria-label="Conduit">
    <span className="brand-mark" aria-hidden="true">co</span>
    {!compact && (
      <span className="brand-copy">
        <span className="brand-name">conduit</span>
        <span className="brand-subtitle">real-time workspace</span>
      </span>
    )}
  </span>
);

export default BrandMark;
