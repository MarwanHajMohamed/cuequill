import { Trade } from "@/hooks/useTrades";
import { PieChart } from "@mui/x-charts";
import React from "react";

export default function Pie({ data }: { data: Trade[] }) {
  const settings = {
    margin: { right: 5 },
    width: 200,
    height: 200,
    hideLegend: true,
  };

  const counts = data.reduce((acc, trade) => {
    acc[trade.status] = (acc[trade.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(counts).map(([status, value]) => {
    let color = "#999";
    if (status === "WIN") color = "#0FD339";
    if (status === "LOSS") color = "#D30F0F";
    if (status === "OPEN") color = "blue";

    return {
      id: status,
      value,
      label: status,
      color,
    };
  });

  const total = data.length;
  const wins = data.filter((trade) => trade.status === "WIN").length;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  return (
    <div className="relative w-[200px] h-[200px] flex items-center justify-center">
      <PieChart
        series={[
          {
            innerRadius: 70,
            outerRadius: 100,
            paddingAngle: 5,
            data: chartData,
          },
        ]}
        {...settings}
        sx={{
          "& .MuiPieArc-root": {
            stroke: "none",
          },
        }}
      />
      <div className="absolute text-center">
        <div className="text-xl font-bold">{winRate.toFixed(2)}%</div>
        <div className="text-sm text-gray-500">Wins</div>
      </div>
    </div>
  );
}
