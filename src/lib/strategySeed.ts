// Seed content for the built-in strategy library, ported from the
// original static strategy pages (pre-rewrite `data/strategies.ts`).
// Keyed by strategy name. Prose, bullet lists, and illustrative charts
// are folded into the rich-text `description` (HTML, same format the
// RichNotesEditor produces). The labelled Successful/Unsuccessful chart
// sets become `examples`. Side-effect-free and client-safe — image
// paths point at /public, no Mongoose, no webpack image imports.

export type ExampleOutcome = "Successful" | "Unsuccessful";

export type StrategyExample = {
  id: string;
  src: string;
  outcome: ExampleOutcome;
  caption?: string;
};

export type StrategySeedContent = {
  description: string;
  examples: StrategyExample[];
};

export const STRATEGY_SEED_CONTENT: Record<string, StrategySeedContent> = {
  "Moving Average 40": {
    description:
      "<h3>Entry requirements</h3>\n<ul><li>The stock must be coming from a recent fall, not after a rally.</li><li>20MA must be above the 40MA.</li><li>The 20MA and 40MA act as floor zones (support levels).</li><li>Trace a bearish line following the fall.</li><li>The stock price should approach or touch the 40MA before considering entry.</li></ul>\n<h3>Moving Average 40 Charts</h3>\n<p>Seminar: S2Day1Vid5 - 01:13:50</p>",
    examples: [
      {
        id: "8aa573f0-98e9-4feb-84e0-e2dc91fbfe97",
        src: "/Moving Average/Successful/MA40.png",
        outcome: "Successful",
      },
      {
        id: "331e9a86-f796-4484-88a8-4643360900c3",
        src: "/Moving Average/Successful/MA40_2.png",
        outcome: "Successful",
      },
      {
        id: "6d98d116-641a-42cf-9558-e9539fd4e821",
        src: "/Moving Average/Successful/MA40_3.png",
        outcome: "Successful",
      },
      {
        id: "181ee9a6-9c8d-497f-973d-8d1f682bb9aa",
        src: "/Moving Average/Successful/MA40_4.png",
        outcome: "Successful",
      },
      {
        id: "81d9b462-2a0c-442e-9717-12136778f70d",
        src: "/Moving Average/Successful/MA40_5.png",
        outcome: "Successful",
      },
      {
        id: "193693e7-df5a-48f1-974d-5ad245d8b56f",
        src: "/Moving Average/Successful/MA40_6.png",
        outcome: "Successful",
      },
      {
        id: "d1bfc315-4eca-4a9c-b07d-29cdbfeb7477",
        src: "/Moving Average/Successful/MA40_7.png",
        outcome: "Successful",
      },
      {
        id: "d289aa31-30e4-467e-963a-05dfc3522e37",
        src: "/Moving Average/Successful/MA40_8.png",
        outcome: "Successful",
      },
      {
        id: "3e2917fe-220a-445b-b716-20c81791b2c3",
        src: "/Moving Average/Successful/MA40_9.png",
        outcome: "Successful",
      },
      {
        id: "c09468ea-72e4-4879-a51c-35629f91518d",
        src: "/Moving Average/Successful/MA40_10.png",
        outcome: "Successful",
      },
      {
        id: "d9fd3572-f9c9-417c-937b-7f00311232ba",
        src: "/Moving Average/Successful/MA40_11.png",
        outcome: "Successful",
      },
      {
        id: "f73e0181-eb89-4b89-816e-df6559d1e1f6",
        src: "/Moving Average/Successful/MA40_12.png",
        outcome: "Successful",
      },
      {
        id: "9e8e5e51-a718-4738-a753-5a40790f0873",
        src: "/Moving Average/Unsuccessful/MA40_1.png",
        outcome: "Unsuccessful",
      },
    ],
  },
  "Normal Fall & Hard Fall": {
    description:
      '<p>Normal fall = small fall.</p>\n<p>In SPY, normal fall = $3-5 maximum of a fall.</p>\n<p>Hard fall = a fall greater than 1.5%.</p>\n<h3>Example</h3>\n<ul><li>Fall from $400 -&gt; $395 is a normal fall.</li><li>Fall from $400 -&gt; $390 is a hard fall.</li></ul>\n<p>In an uptrend, a normal fall or a hard fall could occur &amp; go beneath the 40MA. Then when a bullish candle forms, buy CALL and sell next day.</p>\n<p>20MA doesn\'t have to be over 40MA, but it does help.</p>\n<img src="/NFHF1.png" alt="Normal Fall Hard Fall chart" />\n<img src="/NFHF2.png" alt="Normal Fall Hard Fall chart 2" />',
    examples: [],
  },
  "Bearish Channel Break": {
    description:
      "<h3>Entry requirements</h3>\n<ul><li>Ensure you are in a bearish channel - draw a ceiling line.</li><li>40MA must be above 20MA.</li><li>40MA acts as a ceiling.</li><li>When the candle breaks the ceiling, it's a signal to buy CALL.</li><li>Inside the bearish channel, there is a much higher risk buying calls. It's best to wait until the channel breaks.</li><li>However, you can buy puts inside the channel.</li></ul>\n<h3>Bearish channel break charts</h3>\n<p>Seminar: S2Day1Vid8 - 00:09:51</p>",
    examples: [
      {
        id: "f05d01d8-b1c0-4cc5-8966-0061ba4968cc",
        src: "/BCB.png",
        outcome: "Successful",
      },
      {
        id: "e8a750d0-c144-49c7-b1bf-13f902b3d9dd",
        src: "/BCB2.png",
        outcome: "Successful",
      },
      {
        id: "1dcb1e4e-8f01-4918-99ed-59025bb40b96",
        src: "/BCB3.png",
        outcome: "Successful",
      },
      {
        id: "31e47a44-04b6-4b5e-96c4-0f05954fb5f1",
        src: "/BCB4.png",
        outcome: "Successful",
      },
    ],
  },
  "Normal Bullish Gap": {
    description:
      '<h3>Entry requirements</h3>\n<ul><li>The gap forms when the stock closes at at a certain price like 100 and opens the next day at a higher price like 103.</li><li>This strategy only works when the market is bullish.</li><li>So 20MA &gt; 40MA.</li><li>If the first 2 candles that form are green, buy stock.</li><li>The stock continues to rally.</li><li>If nothing happens the next day, then the stock usually rallies the day after.</li></ul>\n<img src="/NBG.png" alt="Normal Bullish Gap chart" />\n<ul><li>The more gaps that form, the more likely for the stock to fall.</li><li>Invest more in the beginning, then less at the next gap, and even less at the next gap.</li><li>HANGERS ARE FALSE GAPS, DO NOT BUY.</li><li>DOESN\'T WORK INSIDE A BEARISH CHANNEL.</li></ul>\n<img src="/NBG2.png" alt="Normal Bullish Gap chart 2" />\n<p>Seminar: S2Day2Vid1 - 00:00:00</p>',
    examples: [],
  },
  "Bearish Gap Uptrend": {
    description:
      '<h3>Entry requirements</h3>\n<ul><li>The premarket shows the market will open low.</li><li>Market opens lower, and rallies between the hours of 9:30am and 10:00am.</li><li>The first two candles that form are green and bullish.</li><li>This is the only strategy that works in a bearish channel.</li><li>If it forms inside a bearish channel, then it\'s a signal that the channel is almost over.</li><li>It could take a day or two for the channel to break.</li></ul>\n<h3>Bearish gap uptrending charts</h3>\n<img src="/BGU.png" alt="Bearish Gap Uptrending chart" />\n<img src="/BGU2.png" alt="Bearish Gap Uptrending chart 2" />\n<p>Seminar: S2Day2Vid1 - 00:59:37</p>',
    examples: [],
  },
  "Hard Floor": {
    description:
      '<h3>Entry requirements</h3>\n<ul><li>Be in timeframe DAILY.</li><li>Ensure 100MA is above 200MA.</li><li>Stock must fall and touch either 100MA or 200MA.</li><li>Switch to timeframe HOURLY.</li><li>Trace a ceiling line for the fall, and when it breaks that line after 11am, buy calls.</li></ul>\n<img src="/HF1.png" alt="Hard Floor chart" />\n<ul><li>Timeframe hourly chart. Stock tends to rally for 3 to 4 days.</li><li>This strategy comes up very rarely, usually every 2 to 3 months.</li></ul>\n<img src="/HF2.png" alt="Hard Floor chart 2" />\n<p>Seminar: S2Day2Vid3 - 00:00:00</p>',
    examples: [],
  },
  "The First Uptrend Gap": {
    description:
      '<h3>Entry requirements</h3>\n<ul><li>Be in timeframe DAILY.</li><li>Must be coming from a fall.</li><li>Should be in a hard floor zone - 100MA &amp; 200MA act as hard floors, but it could fall below it.</li></ul>\n<img src="/FUG1.png" alt="First Uptrend Gap chart" />\n<ul><li>Switch to timeframe hourly.</li></ul>\n<img src="/FUG2.png" alt="First Uptrend Gap chart 2" />\n<ul><li>The first candle MUST BE GREEN. It cannot be red.</li><li>One candle must have volume. That candle cannot be red or a hanger candle. It must be solid or a hammer.</li><li>This strategy often comes after the hard floor strategy.</li><li>The stock rallies 3-4 days typically.</li></ul>\n<h3>Example with Apple</h3>\n<img src="/FUG3.png" alt="First Uptrend Gap chart 3" />\n<h3>Timeframe hourly</h3>\n<img src="/FUG4.png" alt="First Uptrend Gap chart 4" />\n<p>Seminar: S2Day2Vid3 - 00:30:45</p>',
    examples: [],
  },
  "First Red Opening Candle": {
    description:
      "<h3>Entry requirements</h3>\n<ul><li>Be in a bearish channel.</li><li>The candle that forms between 9:30am and 10:00am is red.</li><li>Buy PUT at 10:00am.</li><li>This is the only strategy that is bought at 10:00am.</li></ul>\n<h3>First red opening candle charts</h3>\n<p>Seminar: S2Day2Vid7 - 01:20:07</p>",
    examples: [
      {
        id: "ba495b01-f3e5-4bc0-9bc5-a4e9bc006b69",
        src: "/FRC/Successful/FROC_1.png",
        outcome: "Successful",
      },
      {
        id: "d0bbdc1a-8b5b-4d4c-9d31-1dbf90fa9703",
        src: "/FRC/Successful/FROC_2.png",
        outcome: "Successful",
      },
      {
        id: "83db4eaf-35bd-451d-b633-4fefab575a33",
        src: "/FRC/Successful/FROC_3.png",
        outcome: "Successful",
      },
      {
        id: "6ab3321b-09e5-4983-8dc3-f9d2b25d7c10",
        src: "/FRC/Successful/FROC_4.png",
        outcome: "Successful",
      },
      {
        id: "a6ae9dbb-af90-48e8-8671-2885998233f1",
        src: "/FRC/Successful/FROC_5.png",
        outcome: "Successful",
      },
      {
        id: "affecfad-2308-4350-a3b7-0fecb27249d5",
        src: "/FRC/Successful/FROC_6.png",
        outcome: "Successful",
      },
      {
        id: "01cfc816-2047-40c6-b42c-4dd010fac6a2",
        src: "/FRC/Successful/FROC_7.png",
        outcome: "Successful",
      },
      {
        id: "89f49fc9-ea9b-41a3-bb4f-789188228168",
        src: "/FRC/Successful/FROC_8.png",
        outcome: "Successful",
      },
      {
        id: "0a744536-d2c0-40af-978a-b030b229f1a4",
        src: "/FRC/Unsuccessful/FROC_1.png",
        outcome: "Unsuccessful",
      },
      {
        id: "8a6c034a-bf99-4bf9-b1b0-69b9b985d1c3",
        src: "/FRC/Unsuccessful/FROC_2.png",
        outcome: "Unsuccessful",
      },
      {
        id: "1e80a204-eb1c-4595-bc64-6e03f422c080",
        src: "/FRC/Unsuccessful/FROC_3.png",
        outcome: "Unsuccessful",
      },
      {
        id: "ab684d07-6782-45b3-b039-778ca26d78ca",
        src: "/FRC/Unsuccessful/FROC_4.png",
        outcome: "Unsuccessful",
      },
      {
        id: "1f719f18-cb0f-407f-a64e-4759a8d95c05",
        src: "/FRC/Unsuccessful/FROC_5.png",
        outcome: "Unsuccessful",
      },
      {
        id: "81c091e3-f808-4718-9948-e218b9246a37",
        src: "/FRC/Unsuccessful/FROC_6.png",
        outcome: "Unsuccessful",
      },
      {
        id: "0d3ce1e3-e658-46db-9d22-72c2b3b75a5f",
        src: "/FRC/Unsuccessful/FROC_7.png",
        outcome: "Unsuccessful",
      },
      {
        id: "6923a165-48da-4c2d-95cc-8b198d51e813",
        src: "/FRC/Unsuccessful/FROC_8.png",
        outcome: "Unsuccessful",
      },
    ],
  },
  "Gap Floor Break": {
    description:
      '<h3>Entry requirements</h3>\n<ul><li>The first candle MUST BE GREEN. It cannot be red.</li><li>Trace the floor line on the green candle.</li><li>Candles after 11am break the floor.</li><li>Buy PUT after it breaks the floor line.</li><li>The break can happen above or below the closing price from the day before.</li><li>Strategy works best when the price is far from the 20MA &amp; 40MA.</li><li>Stratey works well in a bearish channel near the ceiling zone.</li></ul>\n<h3>Gap floor break charts</h3>\n<img src="/GFB.png" alt="Gap Floor Break chart" />\n<img src="/GFB2.png" alt="Gap Floor Break chart 2" />\n<p>Seminar: S2Day2Vid8 - 00:00:20</p>',
    examples: [],
  },
  "Model of 4 Steps": {
    description:
      '<h3>Entry requirements</h3>\n<ul><li>Be in a bearish channel.</li><li>Be in the ceiling zone.</li><li>A green candle must appear which tries to break the channel, but then a red candle comes after and deletes the green one.</li><li>Either the green or the red candle can be the one that is closest to the ceiling.</li><li>Trace the floor line of the rally.</li><li>When the red candle breaks the floor, buy PUT.</li></ul>\n<h3>Model of 4 steps charts</h3>\n<img src="/M4S.png" alt="Model of 4 Steps chart" />\n<img src="/M4S2.png" alt="Model of 4 Steps chart 2" />\n<h3>Example 2</h3>\n<img src="/M4S3.png" alt="Model of 4 Steps chart 3" />\n<p>Seminar: S2Day2Vid10 - 00:00:00</p>',
    examples: [],
  },
  "Hanger in Daily": {
    description:
      '<h3>Entry requirements</h3>\n<ul><li>Be in timeframe DAILY.</li><li>When the price tries to rally in timeframe hourly but falls, it causes a hanger candle in timeframe daily.</li><li>This is a bearish signal.</li><li>At 3:55pm - 3:58pm, if the candle is a hanger, it is probable that it will fall for the next few days.</li><li>That is when you buy PUT.</li><li>Strategy won\'t work if it is near the moving averages, except when it is inside a bearish channel.</li></ul>\n<h3>Hanger in daily charts</h3>\n<img src="/HiD.png" alt="Hanger in Daily chart" />\n<img src="/HiD2.png" alt="Hanger in Daily chart 2" />\n<img src="/HiD3.png" alt="Hanger in Daily chart 3" />\n<p>Seminar: S2Day2Vid10 - 00:29:00</p>',
    examples: [],
  },
};
