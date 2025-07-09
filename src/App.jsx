import { useState } from 'react';
import { Accordion } from './components/Accordion';
import data from './data.json';

export default function App() {
  // 1️⃣ State to hold which term is selected
  const [selected, setSelected] = useState(null);
  // 2️⃣ State to hold the search input’s current value
  const [searchTerm, setSearchTerm] = useState('');

  // 2️⃣ Derive a list of unique category names
  // First filter entries by search text (case-insensitive)
  const filteredData = data.filter(item =>
    item.term.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Then get unique categories from the filtered set
  const categories = Array.from(
    new Set(filteredData.map(item => item.category))
  );
  // 3️⃣ Render layout
  return (
    <div className="flex h-screen bg-blue-100">
      {/* Left sidebar: category accordions */}
      <aside className="w-1/4 border-r overflow-auto">
        {/* 🔍 Search box */}
        <div className="p-4">
          <input
          type="text"
          placeholder="Search terms…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded"
          />
        </div>
        {categories.map(cat => (
          <Accordion key={cat} title={cat}>
            {filteredData
              .filter(item => item.category === cat)
              .map(item => (
                <div
                  key={item.term}
                  className="cursor-pointer py-1 hover:bg-gray-100"
                  onClick={() => setSelected(item)}
                >
                  {item.term}
                </div>
              ))}
          </Accordion>
        ))}
      </aside>

      {/* Right pane: definition detail */}
      <main className="flex-1 p-6">
        {selected ? (
          <>
            <h1 className="text-2xl font-bold">{selected.term}</h1>
            <p className="mt-4">{selected.definition}</p>
          </>
        ) : (
          <p>Select a term on the left to see its definition.</p>
        )}
      </main>
    </div>
  );
}