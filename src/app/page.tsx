'use client';

import { AppProvider } from '../contexts/AppContext';
import SnackCheckApp from '../components/SnackCheckApp';

export default function Home() {
  return (
    <AppProvider>
      <SnackCheckApp />
    </AppProvider>
  );
}
