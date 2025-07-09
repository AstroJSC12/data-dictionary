import React, { useState, useRef, useEffect } from 'react'
import data from './data.json'

export default function App() {
  // ▶️ State
  const [selected, setSelected] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [openCategories, setOpenCategories] = useState({})

  // ▶️ Refs
  const searchInputRef = useRef(null)
  const asideRef = useRef(null)
  const elementRefs = useRef([])

  // ▶️ Shortcut to focus search ('/' or Ctrl+K)
  useEffect(() => {
    const onGlobalKey = e => {
      if (e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onGlobalKey)
    return () => window.removeEventListener('keydown', onGlobalKey)
  }, [])

  // ▶️ Filter data by search
  const filteredData = data.filter(item =>
    item.term.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const categories = Array.from(new Set(filteredData.map(i => i.category)))

  // ▶️ Build a flat list of focusable elements
  elementRefs.current = []
  const visibleElements = []
  if (searchTerm) {
    filteredData.forEach(item => visibleElements.push({ type: 'item', item }))
  } else {
    categories.forEach(cat => {
      visibleElements.push({ type: 'category', category: cat })
      if (openCategories[cat]) {
        filteredData
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
      setOpenCategories(prev => ({ ...prev, [el.category]: true }))
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
            className="w-full p-2 border rounded"
          />
        </div>

        {searchTerm ? (
          <div className="p-4">
            {visibleElements.length > 0 ? (
              visibleElements.map((el, idx) => {
                // only items appear when searching
                if (el.type !== 'item') return null
                return (
                  <div
                    key={el.item.term}
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
                      {openCategories[cat] ? 'v' : '>'}
                    </span>
                    <span className="text-lg font-semibold">{cat}</span>
                  </div>
                  {openCategories[cat] && (
                    <div className="px-6">
                      {filteredData
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