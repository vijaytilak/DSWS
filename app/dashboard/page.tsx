'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { DashboardHeader } from "@/components/layout/header/dashboard-header";
import sampleData from '@/data/sample.json';

const DataSphere = dynamic(() => import('@/components/DataSphere/DataSphere'), {
  ssr: false
});

export default function Page() {
  const [flowType, setFlowType] = useState("two-way flows");
  const [centreFlow, setCentreFlow] = useState(false);
  const [threshold, setThreshold] = useState(0);

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
      <div className="flex-1 overflow-hidden">
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
    </main>
  );
}
