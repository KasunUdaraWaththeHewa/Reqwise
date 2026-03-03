import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { RequestTabs } from '../components/RequestTabs';
import { RequestEditor } from '../components/RequestEditor';
import { ResponseViewer } from '../components/ResponseViewer';
import { StatusBar } from '../components/StatusBar';
import { SearchModal } from '../components/SearchModal';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';

const Index = () => {
  const [isDesktop, setIsDesktop] = React.useState(() => window.innerWidth >= 1280);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const updateLayout = (event: MediaQueryListEvent) => setIsDesktop(event.matches);

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', updateLayout);
    return () => mediaQuery.removeEventListener('change', updateLayout);
  }, []);

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden text-[13px]">
      <div className="flex-1 overflow-hidden p-3">
        <div className="h-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <ResizablePanelGroup direction={isDesktop ? 'horizontal' : 'vertical'} className="h-full">
            <ResizablePanel defaultSize={isDesktop ? 22 : 28} minSize={isDesktop ? 16 : 20} maxSize={isDesktop ? 30 : 40}>
              <Sidebar />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={isDesktop ? 78 : 72} minSize={50}>
              <div className="h-full flex flex-col overflow-hidden bg-background">
                <RequestTabs />

                <ResizablePanelGroup direction={isDesktop ? 'horizontal' : 'vertical'} className="flex-1">
                  <ResizablePanel defaultSize={isDesktop ? 52 : 55} minSize={35}>
                    <div className="h-full flex flex-col overflow-hidden">
                      <RequestEditor />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel defaultSize={isDesktop ? 48 : 45} minSize={30}>
                    <div className="h-full flex flex-col overflow-hidden">
                      <ResponseViewer />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <StatusBar />
      <SearchModal />
    </div>
  );
};

export default Index;
