import React, { useState, useRef, useEffect } from 'react';
import data from './data.json';

export default function App() {
  // ▶ State
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [openGroups, setOpenGroups] = useState({});
  const [openCategories, setOpenCategories] = useState({});

  // ⬇ NEW — clear everything and reset focus
  // make it stable and debug it
  const clearSearch = React.useCallback(() => {
    console.log('🏷️ [clearSearch] — resetting all state');
    setSearchTerm('');
    setOpenGroups({});
    setOpenCategories({});
    setFocusedIndex(-1);
    setSelected(null);
    searchInputRef.current?.focus();
  }, []);
    

  // ▶ Refs
  const searchInputRef = useRef(null);
  const asideRef = useRef(null);
  const elementRefs = useRef([]);

  // ▶ Global '/' or Ctrl+K shortcut → focus search
  useEffect(() => {
    const onGlobalKey = e => {
      console.log('🔑 global key:', e.key);
      // Focus search on / or Ctrl+K
      if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // **Clear** on Esc from anywhere
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSearch();
      }
    };  
    console.log('🚀 adding global keydown listener (capture phase)');
    window.addEventListener('keydown', onGlobalKey, true);
    return () => {
      console.log('🗑️ removing global keydown listener');
      window.removeEventListener('keydown', onGlobalKey, true);
    };
  }, [clearSearch]);
  
  // ▶ Data flattening
  const trimmedTerm = searchTerm.trim().toLowerCase();
  const allItems = data.flatMap(g =>
    g.categories.flatMap(cat =>
      cat.items.map(item => ({
        group: g.group,
        category: cat.name,
        term: item.term,
        definition: item.definition,
        tags: item.tags || []
      }))
    )
  );

  // ▶ Filtered items for search
  const filteredItems = trimmedTerm
    ? allItems.filter(i => i.term.toLowerCase().includes(trimmedTerm))
    : [];

  // ▶ Unique groups & categories
  const groups = trimmedTerm
    ? Array.from(new Set(filteredItems.map(i => i.group)))
    : data.map(g => g.group);

  const categoriesByGroup = groups.reduce((acc, grp) => {
    const source = trimmedTerm
      ? filteredItems
      : allItems.filter(i => i.group === grp);
    acc[grp] = Array.from(new Set(source.map(i => i.category)));
    return acc;
  }, {});

  // ▶ Build flat list for keyboard nav
  elementRefs.current = [];
  const visible = [];

  if (trimmedTerm) {
    // flat list of search results
    filteredItems.forEach(item => visible.push({ type: 'item', item }));
  } else {
    // nested groups → categories → items
    groups.forEach(grp => {
      visible.push({ type: 'group', group: grp });
      if (openGroups[grp]) {
        categoriesByGroup[grp].forEach(cat => {
          visible.push({ type: 'category', group: grp, category: cat });
          if (openCategories[`${grp}::${cat}`]) {
            allItems
              .filter(i => i.group === grp && i.category === cat)
              .forEach(item => visible.push({ type: 'item', item }));
          }
        });
      }
    });
  }

  // ▶ Sync DOM focus
  useEffect(() => {
    const node = elementRefs.current[focusedIndex];
    if (node) node.focus();
  }, [focusedIndex, visible.length]);

  // ▶ Keyboard nav inside sidebar
  const onAsideKeyDown = e => {
    const el = visible[focusedIndex];
    const max = visible.length - 1;
    if (['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Enter',' '].includes(e.key)) {
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') setFocusedIndex(i => Math.min(i + 1, max));
    if (e.key === 'ArrowUp') setFocusedIndex(i => Math.max(i - 1, 0));

    // Expand/collapse logic
    if (el) {
      if ((e.key === 'Enter' || e.key === ' ') && el.type === 'group') {
        setOpenGroups(o => ({ ...o, [el.group]: !o[el.group] }));
      }
      if ((e.key === 'Enter' || e.key === ' ') && el.type === 'category') {
        const key = `${el.group}::${el.category}`;
        setOpenCategories(o => ({ ...o, [key]: !o[key] }));
      }
      if (['ArrowRight','ArrowLeft'].includes(e.key)) {
        if (el.type === 'group') {
          setOpenGroups(o => ({ ...o, [el.group]: e.key === 'ArrowRight' }));
        }
        if (el.type === 'category') {
          const key = `${el.group}::${el.category}`;
          setOpenCategories(o => ({ ...o, [key]: e.key === 'ArrowRight' }));
        }
      }
      if ((e.key === 'Enter' || e.key === ' ') && el.type === 'item') {
        setSelected(el.item);
      }
    }
  };

  return (
    <div className="flex h-screen bg-blue-100">
      <aside
        ref={asideRef}
        tabIndex={0}
         onKeyDown={onAsideKeyDown}
        className="w-1/4 border-r overflow-auto outline-none"
      >
        {/* Search */}
        <div className="p-4">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search terms…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Sidebar content */}
        <div className="p-4">
          {trimmedTerm ? (
            visible.length ? (
              visible.map((el, idx) => (
                <div
                  key={`search-${idx}-${el.item.term.replace(/\s+/g,'_')}`}
                  ref={n => (elementRefs.current[idx] = n)}
                  tabIndex={focusedIndex === idx ? 0 : -1}
                  onFocus={() => setFocusedIndex(idx)}
                  onClick={() => setSelected(el.item)}
                  className={`cursor-pointer py-1 hover:bg-gray-100 ${
                    focusedIndex === idx ? 'bg-gray-200' : ''
                  }`}
                >
                  {el.item.term}
                  <span className="text-sm text-gray-500 ml-2">
                    ({el.item.category} • {el.item.group})
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No matches found.</p>
            )
          ) : (
            // GROUP → CATEGORY → ITEMS
            groups.map(grp => {
              const gIdx = visible.findIndex(
                el => el.type === 'group' && el.group === grp
              );
              return (
                <div key={grp}>
                  {/* Group header */}
                  <div
                    ref={n => (elementRefs.current[gIdx] = n)}
                    tabIndex={focusedIndex === gIdx ? 0 : -1}
                    onFocus={() => setFocusedIndex(gIdx)}
                    onClick={() => setOpenGroups(o => ({ ...o, [grp]: !o[grp] }))}
                    className={`flex items-center py-2 px-4 cursor-pointer hover:bg-gray-100 ${
                      focusedIndex === gIdx ? 'bg-gray-200' : ''
                    }`}
                  >
                    <span className="mr-2 text-lg">
                      {openGroups[grp] ? '▼' : '▶'}
                    </span>
                    <span className="text-lg font-bold">{grp}</span>
                  </div>

                  {/* Categories under group */}
                  {openGroups[grp] && (
                    <div className="pl-4">
                      {categoriesByGroup[grp].map(cat => {
                        const cIdx = visible.findIndex(
                          el => el.type === 'category' && el.category === cat && el.group === grp
                        );
                        const key = `${grp}::${cat}`;
                        return (
                          <div key={cat}>
                            <div
                              ref={n => (elementRefs.current[cIdx] = n)}
                              tabIndex={focusedIndex === cIdx ? 0 : -1}
                              onFocus={() => setFocusedIndex(cIdx)}
                              onClick={() => setOpenCategories(o => ({ ...o, [key]: !o[key] }))}
                              className={`flex items-center py-1 px-4 cursor-pointer hover:bg-gray-100 ${
                                focusedIndex === cIdx ? 'bg-gray-200' : ''
                              }`}
                            >
                              <span className="mr-2">
                                {openCategories[key] ? '▼' : '▶'}
                              </span>
                              <span className="font-medium">{cat}</span>
                            </div>
                            {/* Items under category */}
                            {openCategories[key] &&
                              allItems
                                .filter(i => i.group === grp && i.category === cat)
                                .map(item => {
                                  const iIdx = visible.findIndex(
                                    el => el.type === 'item' && el.item.term === item.term
                                  );
                                  return (
                                    <div
                                      key={item.term}
                                      ref={n => (elementRefs.current[iIdx] = n)}
                                      tabIndex={focusedIndex === iIdx ? 0 : -1}
                                      onFocus={() => setFocusedIndex(iIdx)}
                                      onClick={() => setSelected(item)}
                                      className={`cursor-pointer py-1 pl-8 hover:bg-gray-100 ${
                                        focusedIndex === iIdx ? 'bg-gray-200' : ''
                                      }`}
                                    >
                                      {item.term}
                                    </div>
                                  );
                                })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ───── Detail Pane ───── */}
      <main className="flex-1 p-6">
        {selected ? (
          <>
            <h1 className="text-3xl font-bold">{selected.term}</h1>
            <div className="flex flex-wrap gap-2 mt-2 mb-4">
              {selected.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 text-xs bg-blue-600 text-white rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-4">{selected.definition}</p>
          </>
        ) : (
          <p>Select a term to see its definition.</p>
        )}
      </main>
    </div>
  );
}