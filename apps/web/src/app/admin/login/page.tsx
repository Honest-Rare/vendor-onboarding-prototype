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
        Prototype: the admin login is ADMIN_EMAIL and ADMIN_PASSWORD from the .env file. Production uses single sign-on.
      </SimulatedNote>
    </div>
  );
}
