"use client";

import React from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import { Trade } from "@/app/types/Trades";

export default function Bar({ data }: { data: Trade[] }) {
  const counts = data.reduce(
    (acc, trade) => {
      if (trade.status === "WIN") acc.WIN += 1;
      if (trade.status === "LOSS") acc.LOSS += 1;
      return acc;
    },
    { WIN: 0, LOSS: 0 }
  );

  const colorMap = {
    WIN: "#0FD339",
    LOSS: "#D30F0F",
  };

  return (
    <div>
      <BarChart
        xAxis={[
          {
            data: ["WIN", "LOSS"],
            tickLabelStyle: {
              stroke: "white",
              fontWeight: 200,
            },
            colorMap: {
              type: "ordinal",
              values: ["WIN", "LOSS"],
              colors: [colorMap.WIN, colorMap.LOSS],
            },
          },
        ]}
        series={[{ data: [counts.WIN, counts.LOSS] }]}
        height={250}
        sx={{
          //change left yAxis label styles
          "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
            display: "none",
          },
          // bottomAxis Line Styles
          "& .MuiChartsAxis-bottom .MuiChartsAxis-line": {
            stroke: "#fff",
          },
          // leftAxis Line Styles
          "& .MuiChartsAxis-left .MuiChartsAxis-line": {
            display: "none",
          },
        }}
      />
    </div>
  );
}
