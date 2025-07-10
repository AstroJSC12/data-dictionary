import React, { useState, useRef, useEffect } from 'react'
import data from './data.json'

export default function App() {
  // ▶️ State
  const [selected, setSelected] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [openCategories, setOpenCategories] = useState({})
  const trimmedTerm = searchTerm.trim();

  // ⬇️ NEW — reusable reset helper
  const clearSearch = () => {
    setSearchTerm('');          // blank the input
    setOpenCategories({});      // collapse all categories
    setFocusedIndex(-1);        // reset arrow-key focus
    setSelected(null);          // (optional) clear detail pane
  };

  // ▶️ Refs
  const searchInputRef = useRef(null)
  const asideRef = useRef(null)
  const elementRefs = useRef([])

  // ▶️ Shortcut to focus search ('/' or Ctrl+K)
  useEffect(() => {
    const onGlobalKey = e => {
      // '/' or Ctrl+K → focus search
      if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Esc (from anywhere) → clear & collapse
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSearch();
        searchInputRef.current?.focus();  // ← keep focus right in the box
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, []);

  // ▶️ When the user completely clears the search box, collapse everything
  useEffect(() => {
    if (searchTerm === '') {
      setOpenCategories({})           // close all categories
      setFocusedIndex(-1)             // reset focus
    }
  }, [searchTerm])

  // ▶️ Filter data by search
  const filteredData = trimmedTerm === ''
    ? []                                 // ⭐ nothing to show when box is empty
    : data.filter(item =>
        item.term.toLowerCase().includes(trimmedTerm.toLowerCase())
      );

  // 🔍 DEBUG: log every time searchTerm or results change
  useEffect(() => {
    console.log('🔍 searchTerm:', JSON.stringify(searchTerm));
    console.log('🔍 trimmedTerm:', JSON.stringify(trimmedTerm));
    console.log('🔍 filteredData.length:', filteredData.length);
  }, [searchTerm, trimmedTerm, filteredData]);

  // ▶️ Categories are always based on the **full** dataset
  const categories = Array.from(           // ⭐ moved outside the filter
    new Set(data.map(i => i.category))
  );

  // ▶️ Build a flat list of focusable elements
  elementRefs.current = []
  const visibleElements = []
  if (filteredData.length) {               // ⭐ look at the real list size
    filteredData.forEach(item => visibleElements.push({ type: 'item', item }))
  } else {
    categories.forEach(cat => {
      visibleElements.push({ type: 'category', category: cat })
      if (openCategories[cat]) {
        data
          .filter(i => i.category === cat)
          .forEach(item => visibleElements.push({ type: 'item', item }))
      }
    })
  }

  // ▶️ Autofocus when focusedIndex changes
  useEffect(() => {
    const node = elementRefs.current[focusedIndex]
    if (node) node.focus()
  }, [focusedIndex, visibleElements.length])

  // ▶️ Arrow/Enter/Space navigation
  const onAsideKeyDown = e => {
    const max = visibleElements.length - 1
    if (['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Enter',' '].includes(e.key)) {
      e.preventDefault()
    }
    if (e.key === 'ArrowDown')  setFocusedIndex(i => Math.min(i + 1, max))
    if (e.key === 'ArrowUp')    setFocusedIndex(i => Math.max(i - 1, 0))

    const el = visibleElements[focusedIndex]
    if (e.key === 'ArrowRight' && el?.type === 'category' && !openCategories[el.category]) {
      e.preventDefault();
      // 1) expand
      setOpenCategories(prev => ({ ...prev, [el.category]: true }));
      // 2) immediately move focus into that first child
      etFocusedIndex(focusedIndex + 1);
      return;   // stop here so we don’t also run the ArrowDown logic
    }
    if (e.key === 'ArrowLeft' && el?.type === 'category' && openCategories[el.category]) {
      setOpenCategories(prev => ({ ...prev, [el.category]: false }))
    }
    if (['Enter',' '].includes(e.key) && el) {
      if (el.type === 'category') {
        setOpenCategories(prev => ({ ...prev, [el.category]: !prev[el.category] }))
      } else {
        setSelected(el.item)
      }
    }
  }

   // ▶️ Esc inside the search box → clear search & refocus sidebar
  const onSearchKeyDown = e => {
    if (e.key === 'Escape') {
      setSearchTerm('');       // empty the box
      setOpenCategories({});   // collapse everything
      setFocusedIndex(-1);     // reset keyboard focus
      searchInputRef.current?.focus();   // ← put the cursor right back here
    }
    // ⭐ Tab → jump focus into the list
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      // focus aside, then move into its first element
      asideRef.current?.focus();
      setFocusedIndex(0);
      }
  };

  return (
    <div className="flex h-screen bg-blue-100">
      {/* Sidebar */}
      <aside
        ref={asideRef}
        tabIndex={0}
        onKeyDown={onAsideKeyDown}
        className="w-1/4 border-r overflow-auto outline-none"
      >
        {/* Search box */}
        <div className="p-4">
          <input
            ref={searchInputRef}
          type="text"
          placeholder="Search terms…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={onSearchKeyDown}
          className="w-full p-2 border rounded"
        />
        </div>

        { trimmedTerm !== '' ? (
          <div className="p-4">
            {visibleElements.length > 0 ? (
              visibleElements.map((el, idx) => {
                // only items appear when searching
                if (el.type !== 'item') return null
                return (
                  <div
                    key={idx}
                    ref={node => (elementRefs.current[idx] = node)}
                    tabIndex={focusedIndex === idx ? 0 : -1}
                    onFocus={() => setFocusedIndex(idx)}
                    onClick={() => setSelected(el.item)}
                    className={`cursor-pointer py-1 text-base hover:bg-gray-100 ${
                      focusedIndex === idx ? 'bg-gray-200' : ''
                    }`}
                  >
                    {el.item.term}
                    <span className="text-sm text-gray-500 ml-2">
                      ({el.item.category})
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500">No matches found.</p>
            )}
          </div>
        ) : (
          <div>
            {categories.map(cat => {
              const hi = visibleElements.findIndex(
                el => el.type === 'category' && el.category === cat
              )
              return (
                <div key={cat}>
                  <div
                    ref={node => (elementRefs.current[hi] = node)}
                    tabIndex={focusedIndex === hi ? 0 : -1}
                    onFocus={() => setFocusedIndex(hi)}
                    onClick={() =>
                      setOpenCategories(prev => ({
                        ...prev,
                        [cat]: !prev[cat],
                      }))
                    }
                    className={`flex items-center py-2 px-4 cursor-pointer hover:bg-gray-100 outline-none ${
                      focusedIndex === hi ? 'bg-gray-200' : ''
                    }`}
                  >
                    <span className="mr-2 text-lg">
                      {openCategories[cat] ? '▼' : '▶'}
                    </span>
                    <span className="text-lg font-semibold">{cat}</span>
                  </div>
                  {openCategories[cat] && (
                    <div className="px-6">
                      {data                             // ← use the full dataset here
                        .filter(i => i.category === cat)
                        .map(item => {
                          const ti = visibleElements.findIndex(
                            el =>
                              el.type === 'item' &&
                              el.item.term === item.term
                          )
                          return (
                            <div
                              key={item.term}
                              ref={node => (elementRefs.current[ti] = node)}
                              tabIndex={focusedIndex === ti ? 0 : -1}
                              onFocus={() => setFocusedIndex(ti)}
                              onClick={() => setSelected(item)}
                              className={`cursor-pointer py-1 text-base hover:bg-gray-100 ${
                                focusedIndex === ti ? 'bg-gray-200' : ''
                              }`}
                            >
                              {item.term}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </aside>

      {/* Detail pane */}
      <main className="flex-1 p-6">
        {selected ? (
          <>
            <h1 className="text-3xl font-bold">{selected.term}</h1>
            <div className="flex flex-wrap gap-2 mt-2 mb-4">
              {selected.tags?.map(tag => (
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
  )
}