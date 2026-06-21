import { ReactNode, Suspense } from 'react';

export default function HeadDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <div className="h-screen w-full flex flex-col overflow-hidden bg-white">
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-white custom-scrollbar">
          {children}
        </main>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}} />
    </Suspense>
  );
}
