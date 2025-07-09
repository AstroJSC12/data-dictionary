import { Disclosure } from '@headlessui/react';

export function Accordion({ title, children }) {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex items-center w-full text-left py-2 px-4 border-b">
            {/* Arrow indicator */}
            <span className="mr-2 text-xl">
              {open ? '▼' : '▶'}
            </span>
            {/* Bigger category title */}
            <span className="text-xl font-semibold">
              {title}
            </span>
          </Disclosure.Button>
          <Disclosure.Panel className="px-4 pb-2">
            {/* Smaller item text */}
            <div className="space-y-1">
              {children}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}