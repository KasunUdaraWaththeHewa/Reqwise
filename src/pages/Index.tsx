
import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { RequestTabs } from '../components/RequestTabs';
import { RequestEditor } from '../components/RequestEditor';
import { ResponseViewer } from '../components/ResponseViewer';
import { StatusBar } from '../components/StatusBar';
import { SearchModal } from '../components/SearchModal';

const Index = () => {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Request Tabs */}
          <RequestTabs />
          
          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Request Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <RequestEditor />
            </div>
            
            {/* Response Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ResponseViewer />
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <StatusBar />
      
      {/* Search Modal */}
      <SearchModal />
    </div>
  );
};

export default Index;
