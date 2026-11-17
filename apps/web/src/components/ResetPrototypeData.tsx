'use client';

import { useState } from 'react';
import { resetMockData } from '@/lib/mock/server';

/** Prototype only: puts all sample data back to the state shown in the designs. */
export function ResetPrototypeData() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="link-button"
      onClick={() => {
        resetMockData();
        setDone(true);
      }}
    >
      {done ? 'Prototype data reset' : 'Reset prototype data'}
    </button>
  );
}
