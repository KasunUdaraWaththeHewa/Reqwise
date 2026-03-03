import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { RequestTabs } from '../components/RequestTabs';
import { RequestEditor } from '../components/RequestEditor';
import { ResponseViewer } from '../components/ResponseViewer';
import { StatusBar } from '../components/StatusBar';
import { SearchModal } from '../components/SearchModal';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../components/ui/resizable';

const Index = () => {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden p-3">
        <div className="h-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={22} minSize={16} maxSize={30}>
              <Sidebar />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={78} minSize={50}>
              <div className="h-full flex flex-col overflow-hidden bg-background">
                <RequestTabs />

                <ResizablePanelGroup direction="horizontal" className="flex-1">
                  <ResizablePanel defaultSize={52} minSize={35}>
                    <div className="h-full flex flex-col overflow-hidden">
                      <RequestEditor />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel defaultSize={48} minSize={30}>
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
