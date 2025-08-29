import MA40 from "../public/MA40.png";
import MA402 from "../public/MA40_2.png";
import MA403 from "../public/MA40_3.png";
import NFHF1 from "../public/NFHF1.png";
import NFHF2 from "../public/NFHF2.png";
import BCB from "../public/BCB.png";
import BCB2 from "../public/BCB2.png";
import BCB3 from "../public/BCB3.png";
import NBG from "../public/NBG.png";
import NBG2 from "../public/NBG2.png";
import BGU from "../public/BGU.png";
import BGU2 from "../public/BGU2.png";
import HF1 from "../public/HF1.png";
import HF2 from "../public/HF2.png";
import FUG1 from "../public/FUG1.png";
import FUG2 from "../public/FUG2.png";
import FUG3 from "../public/FUG3.png";
import FUG4 from "../public/FUG4.png";
import FROC from "../public/FROC.png";
import FROC2 from "../public/FROC2.png";
import GFB from "../public/GFB.png";
import GFB2 from "../public/GFB2.png";
import M4S from "../public/M4S.png";
import M4S2 from "../public/M4S2.png";
import M4S3 from "../public/M4S3.png";
import HiD from "../public/HiD.png";
import HiD2 from "../public/HiD2.png";
import HiD3 from "../public/HiD3.png";

export type ContentBlock =
  | { type: "text"; content: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "chart"; src: string; alt?: string }
  | { type: "video"; src: string }
  | { type: "list"; items: string[] };

export interface Strategy {
  slug: string;
  title: string;
  options: "PUT" | "CALL";
  timeframe: "Daily" | "Hourly" | ("Daily" | "Hourly")[];
  blocks: ContentBlock[];
}

export const strategies: Strategy[] = [
  {
    slug: "moving-average-40",
    title: "Moving Average 40",
    options: "CALL",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "The stock must be coming from a recent fall, not after a rally.",
          "20MA must be above the 40MA.",
          "The 20MA and 40MA act as floor zones (support levels).",
          "Trace a bearish line following the fall.",
          "The stock price should approach or touch the 40MA before considering entry.",
        ],
      },
      { type: "text", content: "Moving Average 40 Charts:" },
      { type: "image", src: MA40.src, alt: "Moving Average 40 chart" },
      { type: "image", src: MA402.src, alt: "Moving Average 40 chart 2" },
      { type: "image", src: MA403.src, alt: "Moving Average 40 chart 3" },
      { type: "text", content: "Seminar: S2Day1Vid5 - 01:13:50" },
    ],
  },
  {
    slug: "normal-fall-and-hard-fall",
    title: "Normal Fall & Hard Fall",
    options: "CALL",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Normal fall = small fall." },
      {
        type: "text",
        content: "In SPY, normal fall = $3-5 maximum of a fall.",
      },
      { type: "text", content: "Hard fall = a fall greater than 1.5%." },
      { type: "text", content: "Example:" },
      {
        type: "list",
        items: [
          "Fall from $400 -> $395 is a normal fall.",
          "Fall from $400 -> $390 is a hard fall.",
        ],
      },
      {
        type: "text",
        content:
          "In an uptrend, a normal fall or a hard fall could occur & go beneath the 40MA. Then when a bullish candle forms, buy CALL and sell next day.",
      },
      { type: "text", content: "20MA doesn't have to be over 40MA, but it does help." },
      { type: "text", content: "Normal fall & hard fall charts:" },
      { type: "image", src: NFHF1.src, alt: "Normal Fall Hard Fall chart" },
      { type: "image", src: NFHF2.src, alt: "Normal Fall Hard Fall chart 2" },
    ],
  },
  {
    slug: "bearish-channel-break",
    title: "Bearish Channel Break",
    options: "CALL",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "Ensure you are in a bearish channel - draw a ceiling line.",
          "40MA must be above 20MA.",
          "When the candle breaks the ceiling, it's a signal to buy CALL.",
          "Inside the bearish channel, there is a much higher risk buying calls. It's best to wait until the channel breaks.",
          "However, you can buy puts inside the channel.",
        ],
      },
      { type: "text", content: "Bearish channel break charts:" },
      { type: "image", src: BCB.src, alt: "Bearish Channel Break chart" },
      { type: "image", src: BCB2.src, alt: "Bearish Channel Break chart 2" },
      { type: "image", src: BCB3.src, alt: "Bearish Channel Break chart 3" },
      { type: "text", content: "Seminar: S2Day1Vid8 - 00:09:51" },
    ],
  },
  {
    slug: "normal-bullish-gap",
    title: "Normal Bullish Gap",
    options: "CALL",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "The gap forms when the stock closes at at a certain price like 100 and opens the next day at a higher price like 103.",
          "This strategy only works when the market is bullish.",
          "So 20MA > 40MA.",
          "If the first 2 candles that form are green, buy stock.",
          "The stock continues to rally.",
          "If nothing happens the next day, then the stock usually rallies the day after.",
        ],
      },
      { type: "image", src: NBG.src, alt: "Normal Bullish Gap chart" },
      {
        type: "list",
        items: [
          "The more gaps that form, the more likely for the stock to fall.",
          "Invest more in the beginning, then less at the next gap, and even less at the next gap.",
          "HANGERS ARE FALSE GAPS, DO NOT BUY.",
          "DOESN'T WORK INSIDE A BEARISH CHANNEL.",
        ],
      },
      { type: "image", src: NBG2.src, alt: "Normal Bullish Gap chart 2" },
      { type: "text", content: "Seminar: S2Day2Vid1 - 00:00:00" },
    ],
  },
  {
    slug: "bearish-gap-uptrend",
    title: "Bearish Gap Uptrend",
    options: "CALL",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "The premarket shows the market will open low.",
          "Market opens lower, and rallies between the hours of 9:30am and 10:00am.",
          "The first two candles that form are green and bullish.",
          "This is the only strategy that works in a bearish channel.",
          "If it forms inside a bearish channel, then it's a signal that the channel is almost over.",
          "It could take a day or two for the channel to break.",
        ],
      },
      { type: "text", content: "Bearish gap uptrending charts:" },
      { type: "image", src: BGU.src, alt: "Bearish Gap Uptrending chart" },
      { type: "image", src: BGU2.src, alt: "Bearish Gap Uptrending chart 2" },
      { type: "text", content: "Seminar: S2Day2Vid1 - 00:59:37" },
    ],
  },
  {
    slug: "hard-floor",
    title: "Hard Floor",
    options: "CALL",
    timeframe: ["Daily", "Hourly"],
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "Be in timeframe DAILY.",
          "Ensure 100MA is above 200MA.",
          "Stock must fall and touch either 100MA or 200MA.",
          "Switch to timeframe HOURLY.",
          "Trace a ceiling line for the fall, and when it breaks that line after 11am, buy calls.",
        ],
      },
      { type: "image", src: HF1.src, alt: "Hard Floor chart" },
      {
        type: "list",
        items: [
          "Timeframe hourly chart. Stock tends to rally for 3 to 4 days.",
          "This strategy comes up very rarely, usually every 2 to 3 months.",
        ],
      },
      { type: "image", src: HF2.src, alt: "Hard Floor chart 2" },
      { type: "text", content: "Seminar: S2Day2Vid3 - 00:00:00" },
    ],
  },
  {
    slug: "the-first-uptrend-gap",
    title: "The First Uptrend Gap",
    options: "CALL",
    timeframe: ["Daily", "Hourly"],
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "Be in timeframe DAILY.",
          "Must be coming from a fall.",
          "Should be in a hard floor zone - 100MA & 200MA act as hard floors, but it could fall below it.",
        ],
      },
      { type: "image", src: FUG1.src, alt: "First Uptrend Gap chart" },
      { type: "list", items: ["Switch to timeframe hourly."] },
      { type: "image", src: FUG2.src, alt: "First Uptrend Gap chart 2" },
      {
        type: "list",
        items: [
          "The first candle MUST BE GREEN. It cannot be red.",
          "One candle must have volume. That candle cannot be red or a hanger candle. It must be solid or a hammer.",
          "This strategy often comes after the hard floor strategy.",
          "The stock rallies 3-4 days typically.",
        ],
      },
      { type: "text", content: "Example with Apple:" },
      { type: "image", src: FUG3.src, alt: "First Uptrend Gap chart 3" },
      { type: "text", content: "Timeframe hourly:" },
      { type: "image", src: FUG4.src, alt: "First Uptrend Gap chart 4" },
      { type: "text", content: "Seminar: S2Day2Vid3 - 00:30:45" },
    ],
  },
  {
    slug: "first-red-opening-candle",
    title: "First Red Opening Candle",
    options: "PUT",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "Be in a bearish channel.",
          "The candle that forms between 9:30am and 10:00am is red.",
          "Buy PUT at 10:00am.",
          "This is the only strategy that is bought at 10:00am.",
        ],
      },
      { type: "text", content: "First red opening candle charts:" },
      { type: "image", src: FROC.src, alt: "First Red Opening Candle chart" },
      {
        type: "image",
        src: FROC2.src,
        alt: "First Red Opening Candle chart 2",
      },
      { type: "text", content: "Seminar: S2Day2Vid7 - 01:20:07" },
    ],
  },
  {
    slug: "gap-floor-break",
    title: "Gap Floor Break",
    options: "PUT",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "The first candle MUST BE GREEN. It cannot be red.",
          "Trace the floor line on the green candle.",
          "Candles after 11am break the floor.",
          "Buy PUT after it breaks the floor line.",
          "The break can happen above or below the closing price from the day before.",
          "Strategy works best when the price is far from the 20MA & 40MA.",
          "Stratey works well in a bearish channel near the ceiling zone.",
        ],
      },
      { type: "text", content: "Gap floor break charts:" },
      { type: "image", src: GFB.src, alt: "Gap Floor Break chart" },
      { type: "image", src: GFB2.src, alt: "Gap Floor Break chart 2" },
      { type: "text", content: "Seminar: S2Day2Vid8 - 00:00:20" },
    ],
  },
  {
    slug: "Model-of-four-steps",
    title: "Model of 4 Steps",
    options: "PUT",
    timeframe: "Hourly",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "Be in a bearish channel.",
          "Be in the ceiling zone.",
          "A green candle must appear which tries to break the channel, but then a red candle comes after and deletes the green one.",
          "Either the green or the red candle can be the one that is closest to the ceiling.",
          "Trace the floor line of the rally.",
          "When the red candle breaks the floor, buy PUT.",
        ],
      },
      { type: "text", content: "Model of 4 steps charts:" },
      { type: "image", src: M4S.src, alt: "Model of 4 Steps chart" },
      { type: "image", src: M4S2.src, alt: "Model of 4 Steps chart 2" },
      { type: "text", content: "Example 2:" },
      { type: "image", src: M4S3.src, alt: "Model of 4 Steps chart 3" },
      { type: "text", content: "Seminar: S2Day2Vid10 - 00:00:00" },
    ],
  },
  {
    slug: "hanger-in-daily",
    title: "Hanger in Daily",
    options: "PUT",
    timeframe: "Daily",
    blocks: [
      { type: "text", content: "Entry requirements:" },
      {
        type: "list",
        items: [
          "Be in timeframe DAILY.",
          "When the price tries to rally in timeframe hourly but falls, it causes a hanger candle in timeframe daily.",
          "This is a bearish signal.",
          "At 3:55pm - 3:58pm, if the candle is a hanger, it is probable that it will fall for the next few days.",
          "That is when you buy PUT.",
          "Strategy won't work if it is near the moving averages, except when it is inside a bearish channel.",
        ],
      },
      { type: "text", content: "Hanger in daily charts:" },
      { type: "image", src: HiD.src, alt: "Hanger in Daily chart" },
      { type: "image", src: HiD2.src, alt: "Hanger in Daily chart 2" },
      { type: "image", src: HiD3.src, alt: "Hanger in Daily chart 3" },
      { type: "text", content: "Seminar: S2Day2Vid10 - 00:29:00" },
    ],
  },
];
