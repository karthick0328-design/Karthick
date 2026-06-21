import { Suspense } from 'react';
import TLSidebar from './components/TLSidebar';
import TLHeader from './components/TLHeader';

export default function TLLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-white overflow-hidden font-sans fixed inset-0">
            {/* Global Sidebar */}
            <TLSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Global Header */}
                <TLHeader />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-0 relative scroll-smooth">
                    <Suspense fallback={
                        <div className="flex h-full items-center justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
                        </div>
                    }>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
