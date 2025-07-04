'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { DashboardHeader } from "@/components/layout/header/dashboard-header";
import sampleData from '@/data/ds.json';
import type { FlowData } from '@/components/Datasphere/types';
import { useCentreFlow } from './layout';

const DataSphere = dynamic(() => import('@/components/Datasphere/Datasphere'), {
  ssr: false
});

export default function Page() {
  const [threshold, setThreshold] = useState(0);
  const { centreFlow, setCentreFlow, flowType, setFlowType, isMarketView, flowOption, focusBubbleId, setFocusBubbleId } = useCentreFlow();

  return (
    <main className="flex h-screen flex-col">
      <DashboardHeader
        flowType={flowType}
        setFlowType={setFlowType}
        centreFlow={centreFlow}
        setCentreFlow={setCentreFlow}
        threshold={threshold}
        setThreshold={setThreshold}
      />
      <div className="overflow-hidden">
        <div className="h-full p-4 pt-0">
          <div className="h-full bg-muted/0 p-4">
            <DataSphere 
              data={sampleData as FlowData}
              flowType={flowType}
              centreFlow={centreFlow}
              threshold={threshold}
              isMarketView={isMarketView}
              flowOption={flowOption}
              focusBubbleId={focusBubbleId}
              onFocusBubbleChange={setFocusBubbleId}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
