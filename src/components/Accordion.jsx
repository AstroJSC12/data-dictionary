import { Disclosure } from '@headlessui/react';

export function Accordion({ title, children }) {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="w-full text-left py-2 px-4 border-b">
            {title}
          </Disclosure.Button>
          <Disclosure.Panel className="px-4 pb-2">
            {children}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}