'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { DashboardHeader } from "@/components/layout/header/dashboard-header";
import MonthSelector from "@/components/Datasphere/utils/time-selector";
import sampleData from '@/data/sample.json';
import { useCentreFlow } from './layout';

const DataSphere = dynamic(() => import('@/components/Datasphere/Datasphere'), {
  ssr: false
});

export default function Page() {
  const [flowType, setFlowType] = useState("two-way flows");
  const [threshold, setThreshold] = useState(0);
  const { centreFlow, setCentreFlow } = useCentreFlow();

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
      <div className="h-[calc(100%-200px)] overflow-hidden">
        <div className="h-full p-4 pt-0">
          <div className="h-full rounded-xl bg-muted/50 p-4">
            <DataSphere 
              data={sampleData}
              flowType={flowType}
              centreFlow={centreFlow}
              threshold={threshold}
            />
          </div>
        </div>
      </div>
      <div className="h-[200px] p-4">
        <MonthSelector />
      </div>
    </main>
  );
}
