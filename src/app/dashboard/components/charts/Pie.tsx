import { Trade } from "@/app/types/Trades";
import { PieChart } from "@mui/x-charts";
import React from "react";

export default function Pie({
  data,
  innerRadius,
  outerRadius,
  width,
  height,
  fontSize,
}: {
  data: Trade[];
  innerRadius: number;
  outerRadius: number;
  width: number;
  height: number;
  fontSize: number;
}) {
  const settings = {
    margin: { right: 5 },
    width: width,
    height: height,
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
    <div
      className={`relative w-[${width}px] h-[${height}px] flex items-center justify-center`}
    >
      <PieChart
        series={[
          {
            innerRadius: innerRadius,
            outerRadius: outerRadius,
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
        <div className={`text-xs md:text-[${fontSize}px] font-bold`}>
          {winRate.toFixed(2)}%
        </div>
        <div className={`text-xs md:text-[${fontSize}px] text-gray-500`}>
          Wins
        </div>
      </div>
    </div>
  );
}
