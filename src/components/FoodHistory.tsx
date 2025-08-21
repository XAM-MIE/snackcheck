'use client';

import { Clock, AlertCircle } from 'lucide-react';

interface ScannedFood {
  id: number;
  name: string;
  date: string;
  time: string;
  healthScore: number;
  warnings: string[];
}

const mockScannedFoods: ScannedFood[] = [
  {
    id: 1,
    name: "Organic Granola Bar",
    date: "2023-06-15",
    time: "08:30 AM",
    healthScore: 85,
    warnings: ["High Sugar", "Contains Nuts"]
  },
  {
    id: 2,
    name: "Greek Yogurt",
    date: "2023-06-14",
    time: "01:15 PM",
    healthScore: 92,
    warnings: ["Contains Dairy"]
  },
  {
    id: 3,
    name: "Protein Shake",
    date: "2023-06-14",
    time: "10:45 AM",
    healthScore: 78,
    warnings: ["Artificial Sweeteners"]
  },
  {
    id: 4,
    name: "Avocado Toast",
    date: "2023-06-13",
    time: "09:20 AM",
    healthScore: 88,
    warnings: []
  }
];

interface FoodHistoryProps {
  scanHistory?: unknown[];
}

export function FoodHistory({ scanHistory }: FoodHistoryProps) {
  return (
    <div className="w-full">
      <div className="space-y-4">
        {mockScannedFoods.map((food) => (
          <div key={food.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div>
                <h3 className="font-medium text-gray-900">{food.name}</h3>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{food.date} at {food.time}</span>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end">
                <span className={`text-lg font-bold ${
                  food.healthScore >= 80 ? 'text-green-600' :
                  food.healthScore >= 60 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {food.healthScore}%
                </span>
                <span className="text-xs text-gray-500">Health Score</span>
              </div>
            </div>
            {food.warnings.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {food.warnings.map((warning, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {warning}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}