import React, { useState, useRef, useEffect } from 'react';
import data from './data.json';

// The main React component for the data dictionary app
export default function App() {
  // ▶ Type-to-select buffer and timer
  // typeSelectBuffer: Stores the current buffer of characters typed for type-to-select navigation
  // typeSelectTimer: Timer ref to clear the buffer after a short delay
  const [typeSelectBuffer, setTypeSelectBuffer] = useState('');
  const typeSelectTimer = useRef(null);
  // ▶ State
  // selected: The currently selected item (term)
  // searchTerm: The search bar input value
  // focusedIndex: The index of the currently keyboard-focused element in the sidebar
  // openGroups: Tracks which groups are expanded (by group name)
  // openCategories: Tracks which categories are expanded (by group::category key)
  const [selected, setSelected] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [openGroups, setOpenGroups] = useState({});
  const [openCategories, setOpenCategories] = useState({});

  // clearSearch: Resets all state to initial, empties search, closes all groups/categories, resets focus/selection
  const clearSearch = React.useCallback(() => {
    console.log('🏷️ [clearSearch] — resetting all state');
    setSearchTerm('');
    setOpenGroups({});
    setOpenCategories({});
    setFocusedIndex(-1);
    setSelected(null);
    // Focus the search input after clearing
    searchInputRef.current?.focus();
  }, []);
    

  // ▶ Refs
  // searchInputRef: Ref to the search input box (for focus control)
  // asideRef: Ref to the sidebar container (for keyboard events)
  // elementRefs: Ref array for all visible sidebar elements (for focus management)
  const searchInputRef = useRef(null);
  const asideRef = useRef(null);
  const elementRefs = useRef([]);

  // ▶ Global keyboard shortcuts
  // '/' or Ctrl+K anywhere focuses the search input
  // 'Escape' anywhere clears search and resets state
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
    // Listen globally in capture phase so it works even if input is not focused
    console.log('🚀 adding global keydown listener (capture phase)');
    window.addEventListener('keydown', onGlobalKey, true);
    return () => {
      console.log('🗑️ removing global keydown listener');
      window.removeEventListener('keydown', onGlobalKey, true);
    };
  }, [clearSearch]);
  
  // ▶ Data flattening
  // trimmedTerm: Lowercased, trimmed search input for filtering
  const trimmedTerm = searchTerm.trim().toLowerCase();
  // allItems: Flattens all groups/categories/items into a single array of item objects
  const allItems = data.flatMap(g =>
    g.categories.flatMap(cat =>
      cat.items.map(item => ({
        group: g.group,           // Group name
        category: cat.name,       // Category name
        term: item.term,          // The term
        definition: item.definition, // The definition (string or array)
        tags: item.tags || []     // Optional tags
      }))
    )
  );

  // ▶ Filtered items for search
  // filteredItems: All items matching the search term (term or definition)
  const filteredItems = trimmedTerm
    ? allItems.filter(i =>
        i.term.toLowerCase().includes(trimmedTerm) ||
        (typeof i.definition === 'string'
          ? i.definition.toLowerCase().includes(trimmedTerm)
          : Array.isArray(i.definition)
            ? i.definition.some(line => line.toLowerCase().includes(trimmedTerm))
            : false)
      )
    : [];

  // ▶ Unique groups & categories
  // groups: Array of group names to display (filtered if searching)
  const groups = trimmedTerm
    ? Array.from(new Set(filteredItems.map(i => i.group)))
    : data.map(g => g.group);

  // categoriesByGroup: For each group, array of category names (filtered if searching)
  const categoriesByGroup = groups.reduce((acc, grp) => {
    const source = trimmedTerm
      ? filteredItems
      : allItems.filter(i => i.group === grp);
    acc[grp] = Array.from(new Set(source.map(i => i.category)));
    return acc;
  }, {});

  // ▶ Build flat list for keyboard nav
  // elementRefs.current: Reset the array of refs for focusable elements
  elementRefs.current = [];
  // visible: Flat array of all visible sidebar elements (groups, categories, items) in order
  const visible = [];

  if (trimmedTerm) {
    // If searching, show only matching items as a flat list
    filteredItems.forEach(item => visible.push({ type: 'item', item }));
  } else {
    // Otherwise, build nested list: group → category → items
    groups.forEach(grp => {
      visible.push({ type: 'group', group: grp }); // Add group header
      if (openGroups[grp]) {
        categoriesByGroup[grp].forEach(cat => {
          visible.push({ type: 'category', group: grp, category: cat }); // Add category header
          if (openCategories[`${grp}::${cat}`]) {
            // If category is open, add all items under it
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
    // When focusedIndex changes, auto-focus the corresponding sidebar element (unless search input is focused)
    if (document.activeElement !== searchInputRef.current) {
      const node = elementRefs.current[focusedIndex];
      if (node) node.focus();
    }

    // Automatically select the item under focus (for detail pane)
    const focused = visible[focusedIndex];
    if (focused && focused.type === 'item') {
      setSelected(focused.item);
    }
  }, [focusedIndex, visible.length]);

  // ▶ Cleanup type-to-select timer on unmount
  useEffect(() => {
    // Prevent memory leaks by clearing the timer if component unmounts
    return () => {
      if (typeSelectTimer.current) clearTimeout(typeSelectTimer.current);
    };
  }, []);

  // ▶ Keyboard nav inside sidebar
  // isTextInput: Utility to check if an element is a text input (to avoid hijacking typing)
  const isTextInput = el =>
    el && (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable
    );

// Expand group and all categories under it
// Called when user wants to fully expand a group (including all categories)
function expandGroupFully(group) {
  setOpenGroups(o => ({ ...o, [group]: true }));
  setOpenCategories(o => {
    const updated = { ...o };
    (categoriesByGroup[group] || []).forEach(cat => {
      updated[`${group}::${cat}`] = true; // Open every category in this group
    });
    return updated;
  });
}

// Collapse group and all categories under it, and reset open state
// Called when user wants to fully collapse a group (and all its categories)
function collapseGroupFully(group) {
  setOpenGroups(o => ({ ...o, [group]: false }));
  setOpenCategories(o => {
    const updated = { ...o };
    (categoriesByGroup[group] || []).forEach(cat => {
      delete updated[`${group}::${cat}`]; // Remove open state for each category
    });
    return updated;
  });
}

// Helper to get the label for any visible element
// Used for type-to-select navigation (returns string label)
function getLabel(el) {
  if (el.type === 'group') return el.group;
  if (el.type === 'category') return el.category;
  if (el.type === 'item') return el.item.term;
  return '';
}

const onAsideKeyDown = e => {
    // Type-to-select logic
    if (
      !isTextInput(document.activeElement) &&
      e.key.length === 1 &&
      !e.ctrlKey && !e.metaKey && !e.altKey
    ) {
      const char = e.key;
      const newBuffer = (typeSelectBuffer + char).trim();
      setTypeSelectBuffer(newBuffer);

      // Reset timer
      if (typeSelectTimer.current) clearTimeout(typeSelectTimer.current);
      typeSelectTimer.current = setTimeout(() => setTypeSelectBuffer(''), 700);

      // Find first visible item (any tier) whose label starts with buffer
      const idx = visible.findIndex(
        el => getLabel(el).toLowerCase().startsWith(newBuffer.toLowerCase())
      );
      if (idx !== -1) {
        setFocusedIndex(idx);
      }
      e.preventDefault();
      return;
    }
    const el = visible[focusedIndex];
    const max = visible.length - 1;
    // Only handle keys if NOT in a text input and no modifier keys
    const inTextInput = isTextInput(document.activeElement);
    const hasModifier = e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
    if (!inTextInput && !hasModifier) {
      if (['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Enter'].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === ' ') {
        e.preventDefault();
      }
    }

    // Command + Up/DownArrow: jump to first/last visible group (tier 1)
    if (e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const groups = visible
        .map((el, idx) => ({ el, idx }))
        .filter(({ el }) => el.type === 'group');
      if (groups.length) {
        const newIdx = e.key === 'ArrowUp' ? groups[0].idx : groups[groups.length - 1].idx;
        setFocusedIndex(newIdx);
      }
      return;
    }

    // Option + Up/DownArrow: jump to next/prev visible group if on group, else up a tier
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const current = visible[focusedIndex];
      // If current is a group (tier 1), jump to next/prev visible group
      if (current && current.type === 'group') {
        const groups = visible
          .map((el, idx) => ({ el, idx }))
          .filter(({ el }) => el.type === 'group');
        const pos = groups.findIndex(({ idx }) => idx === focusedIndex);
        let newIdx;
        if (e.key === 'ArrowUp' && pos > 0) newIdx = groups[pos - 1].idx;
        if (e.key === 'ArrowDown' && pos < groups.length - 1) newIdx = groups[pos + 1].idx;
        if (newIdx !== undefined) setFocusedIndex(newIdx);
        return;
      }
      // For other tiers, jump to next/prev visible item at next higher tier
      let targetType = null;
      if (current && current.type === 'item') targetType = 'category';
      else if (current && current.type === 'category') targetType = 'group';
      if (!targetType) return;

      const all = visible
        .map((el, idx) => ({ el, idx }))
        .filter(({ el }) => el.type === targetType);

      let newIdx = undefined;
      if (e.key === 'ArrowUp') {
        for (let i = all.length - 1; i >= 0; i--) {
          if (all[i].idx < focusedIndex) {
            newIdx = all[i].idx;
            break;
          }
        }
      } else {
        for (let i = 0; i < all.length; i++) {
          if (all[i].idx > focusedIndex) {
            newIdx = all[i].idx;
            break;
          }
        }
      }
      if (newIdx !== undefined) setFocusedIndex(newIdx);
      return;
    }

    // Option + RightArrow: expand group and all subcategories
    if (e.altKey && e.key === 'ArrowRight' && el && el.type === 'group' && !openGroups[el.group]) {
      expandGroupFully(el.group);
      return;
    }
    // Option + LeftArrow: collapse group and all subcategories
    if (e.altKey && e.key === 'ArrowLeft' && el && el.type === 'group' && openGroups[el.group]) {
      collapseGroupFully(el.group);
      return;
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
            {Array.isArray(selected.definition) ? (
              <div className="mt-4 space-y-1">
                {selected.definition.map((line, i) => (
                  <div
                    key={i}
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4" style={{ whiteSpace: 'pre-wrap' }}>{selected.definition}</p>
            )}
          </>
        ) : (
          <><p>Select a term to see its definition.</p><p>Press 'Esc' or '/' to enter search field.</p><p>Use arrow keys to navigate (← or → to fold/unfold).</p></>
        )}
      </main>
    </div>
  );
}