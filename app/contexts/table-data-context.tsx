'use client';

import { createContext, useContext, useState } from 'react';
import { TableDataItem } from '@/components/Datasphere/types';

interface TableDataContextType {
  tableData: TableDataItem[];
  setTableData: (data: TableDataItem[]) => void;
  selectedItemLabel: string;
  setSelectedItemLabel: (label: string) => void;
}

const TableDataContext = createContext<TableDataContextType | undefined>(undefined);

export function useTableData() {
  const context = useContext(TableDataContext);
  if (context === undefined) {
    throw new Error('useTableData must be used within a TableDataProvider');
  }
  return context;
}

export function TableDataProvider({ children }: { children: React.ReactNode }) {
  const [tableData, setTableData] = useState<TableDataItem[]>([]);
  const [selectedItemLabel, setSelectedItemLabel] = useState<string>('');

  return (
    <TableDataContext.Provider value={{ 
      tableData, 
      setTableData, 
      selectedItemLabel, 
      setSelectedItemLabel 
    }}>
      {children}
    </TableDataContext.Provider>
  );
}
