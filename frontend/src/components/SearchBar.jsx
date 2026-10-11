import { useState } from 'react';

export default function SearchBar({ initialValue = '', onSearch, placeholder = 'Search events, artists, venues...' }) {
  const [value, setValue] = useState(initialValue);

  const submit = (e) => {
    e.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form className="search-bar" onSubmit={submit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <button type="submit" className="btn btn-primary">Search</button>
    </form>
  );
}
