'use client';

import { Suspense } from 'react';
import { LoginForm } from '@/components/LoginForm';
import { SimulatedNote } from '@/components/ui';

export default function AdminLoginPage() {
  return (
    <div className="stack">
      <h1>Admin sign-in</h1>
      <Suspense>
        <LoginForm role="admin" home="/admin" />
      </Suspense>
      <SimulatedNote>
        Prototype: any email and password sign you in. Production uses single sign-on.
      </SimulatedNote>
    </div>
  );
}
