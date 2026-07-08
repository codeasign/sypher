import React from 'react';
import type { ReactNode } from 'react';
import { AuthProvider } from '@site/src/contexts/AuthContext';

export default function Root({ children }: { children: ReactNode }): JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
