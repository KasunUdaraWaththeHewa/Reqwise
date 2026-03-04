import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Sparkles } from 'lucide-react';

import { Sidebar } from '../components/Sidebar';
import { RequestTabs } from '../components/RequestTabs';
import { RequestEditor } from '../components/RequestEditor';
import { ResponseViewer } from '../components/ResponseViewer';
import { StatusBar } from '../components/StatusBar';
import { SearchModal } from '../components/SearchModal';
import { Button } from '../components/ui/button';
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
      <header className="mx-3 mt-3 rounded-xl border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Reqwise Workspace
            </p>
            <h1 className="text-sm font-semibold sm:text-base">Design, run, and analyze API requests in one focused view.</h1>
          </div>
          <Button asChild variant="secondary" size="sm" className="w-fit">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-3 pt-2">
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
