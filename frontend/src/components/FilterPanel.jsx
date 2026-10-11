const CATEGORIES = ['MUSIC', 'SPORTS', 'THEATRE', 'COMEDY', 'CONFERENCE', 'OTHER'];

export default function FilterPanel({ filters, onChange, onClear }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <aside className="filter-panel">
      <div className="filter-panel-header">
        <h4>Filters</h4>
        <button className="link-btn" onClick={onClear}>Clear all</button>
      </div>

      <div className="filter-group">
        <label>Category</label>
        <select value={filters.category || ''} onChange={(e) => update('category', e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>City</label>
        <input
          type="text"
          value={filters.city || ''}
          onChange={(e) => update('city', e.target.value)}
          placeholder="e.g. Bengaluru"
        />
      </div>

      <div className="filter-group">
        <label>Date</label>
        <input
          type="date"
          value={filters.date || ''}
          onChange={(e) => update('date', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Price range (₹)</label>
        <div className="filter-range">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={filters.minPrice || ''}
            onChange={(e) => update('minPrice', e.target.value)}
          />
          <span>-</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={filters.maxPrice || ''}
            onChange={(e) => update('maxPrice', e.target.value)}
          />
        </div>
      </div>
    </aside>
  );
}
